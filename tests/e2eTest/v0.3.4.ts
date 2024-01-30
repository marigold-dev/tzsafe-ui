import { MichelsonMap, TezosToolkit } from "@taquito/taquito";
import { char2Bytes } from "@taquito/tzip16";
import BigNumber from "bignumber.js";
import { describe, expect, it, beforeAll } from "vitest";
import { proposal } from "../../types/Proposal0_3_4";
import { contractStorage } from "../../types/app";
import { VersionedApi } from "../../versioned/apis";
import deployTzSafe from "../../versioned/deployTzSafe";
import { proposals } from "../../versioned/interface";
import { owner, pb, rpc } from "./config";
import { retry } from "./util";

const tenMins = 600000;
const version = "0.3.4";
const ipfs_file = "ipfs://QmPkai5FJL2QELFcmnmaDHNZ7NRC4XYBdL7P6RLVMNx7eu";

// There are dependency for test cases. They must in order.
const test_suit = (setTezosToolkit: (tezos: TezosToolkit) => TezosToolkit) =>
  describe(`Test version ${version}`, () => {
    let tezos: TezosToolkit;
    let addr: string;

    beforeAll(async () => {
      tezos = setTezosToolkit(tezos);
    });

    it(
      "test originate tzsafe",
      async () => {
        const tzsafe = await retry(() =>
          deployTzSafe(tezos.wallet, [owner], 1, 864000, version)
        );
        addr = tzsafe.address;
        console.log(`${version} is deployed, ${addr}`);
        const storage: contractStorage = await retry(() => tzsafe.storage());

        expect(tzsafe.address).toBeDefined();
        expect(storage.threshold.isEqualTo(BigNumber(1))).toBe(true);
        expect(storage.proposal_counter.isEqualTo(BigNumber(0))).toBe(true);
        expect(storage.owners).toEqual([owner]);
        storage.metadata.get("").then((value: string) => {
          expect(value).toEqual(char2Bytes(ipfs_file));
        });
      },
      { timeout: tenMins }
    );

    it(
      "test submitTxProposals",
      async () => {
        const v = VersionedApi(version, addr);
        const tzsafe = await retry(() => tezos.wallet.at(addr));
        const proposals: proposals = {
          transfers: [
            {
              type: "transfer",
              values: {
                to: owner,
                amount: "1",
              },
            },
            {
              type: "transfer",
              values: {
                to: owner,
                amount: "2",
              },
            },
          ],
        };

        const before_storage: contractStorage = await retry(() =>
          tzsafe.storage()
        );
        const before_proposal_counter: BigNumber =
          before_storage.proposal_counter;

        const deployed_result = await retry(() =>
          v.submitTxProposals(tzsafe, tezos, proposals)
        );

        const [_, msg] = deployed_result;
        expect(msg.startsWith("op")).toBeDefined();

        const after_storage: contractStorage = await retry(() =>
          tzsafe.storage()
        );
        const after_proposal_counter: BigNumber =
          after_storage.proposal_counter;

        expect(after_proposal_counter.toNumber()).toBe(
          before_proposal_counter.toNumber() + 1
        );
        after_storage.proposals
          .get(after_proposal_counter.toNumber())
          .then((value: any) => {
            expect(value).toBeDefined();
            expect(value.contents.length).toBe(2);
          });
      },
      { timeout: tenMins }
    );

    it(
      "test signProposal to sign proposal only",
      async () => {
        const v = VersionedApi(version, addr);
        const tzsafe = await tezos.wallet.at(addr);

        const before_storage: contractStorage = await retry(() =>
          tzsafe.storage()
        );
        const before_proposal: any = await retry(() =>
          before_storage.proposals.get(before_storage.proposal_counter)
        );
        const before_sigs: MichelsonMap<string, boolean> =
          before_proposal.signatures;
        expect(before_sigs.size).toBe(0);

        await retry(() =>
          v.signProposal(
            tzsafe,
            tezos,
            before_storage.proposal_counter,
            true,
            false
          )
        );

        const after_storage: contractStorage = await retry(() =>
          tzsafe.storage()
        );
        const after_proposal: any = await retry(() =>
          after_storage.proposals.get(after_storage.proposal_counter)
        );
        const after_sigs: MichelsonMap<string, boolean> =
          after_proposal.signatures;
        expect(after_sigs.size).toBe(1);
        expect(after_sigs.get(owner)).toBe(true);
      },
      { timeout: tenMins }
    );

    it(
      "test receive xtz and signProposal to resolve proposal only",
      async () => {
        const op = await retry(() =>
          tezos.wallet.transfer({ to: addr, amount: 3 }).send()
        );
        await op.confirmation();

        const v = VersionedApi(version, addr);
        const tzsafe = await tezos.wallet.at(addr);

        const before_storage: contractStorage = await retry(() =>
          tzsafe.storage()
        );
        const before_arcihve: any = await retry(() =>
          before_storage.archives.get(before_storage.proposal_counter)
        );
        expect(before_arcihve).toBeUndefined();

        await retry(() =>
          v.signProposal(
            tzsafe,
            tezos,
            before_storage.proposal_counter,
            undefined,
            true
          )
        );

        const after_storage: contractStorage = await retry(() =>
          tzsafe.storage()
        );
        const after_archive: { executed: Symbol } = await retry(() =>
          after_storage.archives.get(after_storage.proposal_counter)
        );
        expect(after_archive.executed).toBeDefined();
        expect((await tezos.tz.getBalance(addr)).toNumber()).toBe(0);
      },
      { timeout: tenMins }
    );

    it(
      "test submitSettingsProposals and resolve proposal",
      async () => {
        const v = VersionedApi(version, addr);
        const tzsafe = await tezos.wallet.at(addr);

        const before_storage: contractStorage = await retry(() =>
          tzsafe.storage()
        );
        const before_effectivePeriod = before_storage.effective_period;

        await retry(() =>
          v.submitSettingsProposals(tzsafe, tezos, [
            { adjustEffectivePeriod: before_effectivePeriod.toNumber() + 2 },
          ])
        );

        await retry(() =>
          v.signProposal(
            tzsafe,
            tezos,
            before_storage.proposal_counter.plus(BigNumber(1)),
            true,
            true
          )
        );

        const after_storage: contractStorage = await retry(() =>
          tzsafe.storage()
        );
        expect(after_storage.effective_period.toNumber()).toBe(
          before_effectivePeriod.toNumber() + 2
        );
      },
      { timeout: tenMins }
    );

    it(
      "test submitTxProposals through proof-of-event challenge",
      async () => {
        const v = VersionedApi(version, addr);
        const tzsafe = await retry(() => tezos.wallet.at(addr));
        const proposals: proposals = {
          transfers: [
            {
              type: "poe",
              values: {
                payload: "0001",
              },
              fields: [],
            },
            {
              type: "poe",
              values: {
                payload: "0002",
              },
              fields: [],
            },
            {
              type: "transfer",
              values: {
                to: owner,
                amount: "1",
              },
            },
            {
              type: "transfer",
              values: {
                to: owner,
                amount: "2",
              },
            },
          ],
        };

        const before_storage: contractStorage = await retry(() =>
          tzsafe.storage()
        );
        const before_proposal_counter: BigNumber =
          before_storage.proposal_counter;

        const deployed_result = await retry(() =>
          v.submitTxProposals(tzsafe, tezos, proposals)
        );

        const [_, msg] = deployed_result;
        expect(msg.startsWith("op")).toBeDefined();

        const after_storage: contractStorage = await retry(() =>
          tzsafe.storage()
        );
        const after_proposal_counter: BigNumber =
          after_storage.proposal_counter;

        expect(after_proposal_counter.toNumber()).toBe(
          before_proposal_counter.toNumber() + 3
        );

        after_storage.proposals
          .get(after_proposal_counter.toNumber())
          .then((value: proposal) => {
            expect(value.contents.filter(v => "transfer" in v).length).toBe(2);
          });
        after_storage.proposals
          .get(after_proposal_counter.toNumber() - 1)
          .then((value: proposal) => {
            expect(value.contents.length).toBe(1);
            expect(
              value.contents.find(v => "proof_of_event" in v)
            ).toBeDefined();
          });

        after_storage.proposals
          .get(after_proposal_counter.toNumber() - 2)
          .then((value: proposal) => {
            expect(value.contents.length).toBe(1);
            expect(
              value.contents.find(v => "proof_of_event" in v)
            ).toBeDefined();
          });
      },
      { timeout: tenMins }
    );

    it(
      "test submitTxProposals with sign",
      async () => {
        const v = VersionedApi(version, addr);
        const tzsafe = await retry(() => tezos.wallet.at(addr));
        const proposals: proposals = {
          transfers: [
            {
              type: "transfer",
              values: {
                to: owner,
                amount: "1",
              },
            },
            {
              type: "transfer",
              values: {
                to: owner,
                amount: "2",
              },
            },
            {
              type: "poe",
              values: {
                payload: "0001",
              },
              fields: [],
            },
          ],
        };

        const before_storage: contractStorage = await retry(() =>
          tzsafe.storage()
        );
        const before_proposal_counter: BigNumber =
          before_storage.proposal_counter;

        const deployed_result = await retry(() =>
          v.submitTxProposals(
            tzsafe,
            tezos,
            proposals,
            true,
            undefined,
            true,
            false
          )
        );

        const [_, msg] = deployed_result;
        expect(msg.startsWith("op")).toBeDefined();

        // proposal validation
        const after_storage: contractStorage = await retry(() =>
          tzsafe.storage()
        );

        const after_proposal_counter: BigNumber =
          after_storage.proposal_counter;

        expect(after_proposal_counter.toNumber()).toBe(
          before_proposal_counter.toNumber() + 2
        );
        after_storage.proposals
          .get(after_proposal_counter.toNumber())
          .then((value: any) => {
            expect(value).toBeDefined();
            expect(value.contents.length).toBe(2);
          });

        // sign validation
        const after_proposal: any = await retry(() =>
          after_storage.proposals.get(after_storage.proposal_counter)
        );
        const after_sigs: MichelsonMap<string, boolean> =
          after_proposal.signatures;
        expect(after_sigs.size).toBe(1);
        expect(after_sigs.get(owner)).toBe(true);

        const after_poe_proposal: any = await retry(() =>
          after_storage.proposals.get(after_storage.proposal_counter.minus(1))
        );
        const after_poe_sigs: MichelsonMap<string, boolean> =
          after_poe_proposal.signatures;
        expect(after_poe_sigs.size).toBe(1);
        expect(after_poe_sigs.get(owner)).toBe(true);
      },
      { timeout: tenMins }
    );

    it(
      "test submitTxProposals with sign and resolve",
      async () => {
        const op = await retry(() =>
          tezos.wallet.transfer({ to: addr, amount: 3 }).send()
        );
        await retry(() => op.confirmation());
        const v = VersionedApi(version, addr);
        const tzsafe = await retry(() => tezos.wallet.at(addr));
        const proposals: proposals = {
          transfers: [
            {
              type: "transfer",
              values: {
                to: owner,
                amount: "1",
              },
            },
            {
              type: "transfer",
              values: {
                to: owner,
                amount: "2",
              },
            },
            {
              type: "poe",
              values: {
                payload: "0001",
              },
              fields: [],
            },
          ],
        };

        const before_balance = await retry(() => tezos.tz.getBalance(addr));
        expect(before_balance.toNumber()).toBe(3000000);

        const deployed_result = await retry(() =>
          v.submitTxProposals(
            tzsafe,
            tezos,
            proposals,
            true,
            undefined,
            true,
            true
          )
        );

        const [_, msg] = deployed_result;
        expect(msg.startsWith("op")).toBeDefined();

        // resolve validation
        const after_storage: contractStorage = await retry(() =>
          tzsafe.storage()
        );
        const after_archive: { executed: Symbol } = await retry(() =>
          after_storage.archives.get(after_storage.proposal_counter)
        );
        expect(after_archive.executed).toBeDefined();
        const after_balance = await retry(() => tezos.tz.getBalance(addr));
        expect(after_balance.toNumber()).toBe(0);

        const after_poe_archive: { executed: Symbol } = await retry(() =>
          after_storage.archives.get(after_storage.proposal_counter.minus(1))
        );
        expect(after_poe_archive.executed).toBeDefined();
      },
      { timeout: tenMins }
    );

    it("should generate the SPOE transaction and it should be executed when applied", async () => {
      const v = VersionedApi(version, addr);

      const contract = await retry(() => tezos.wallet.at(addr));
      const ops = await retry(() =>
        v.generateSpoeOps("myPayload", contract, tezos)
      );

      const [response] = await retry(() => tezos.rpc.preapplyOperations(ops));

      expect(
        // @ts-ignore
        response.contents.map(v => v.metadata.operation_result)
      ).toMatchObject([
        { status: "applied" },
        { status: "applied" },
        { status: "applied" },
      ]);
    });
  });

export default test_suit;
