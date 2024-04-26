import { MichelsonMap, TezosToolkit } from "@taquito/taquito";
import { stringToBytes } from "@taquito/tzip16";
import BigNumber from "bignumber.js";
import { describe, expect, it, beforeAll } from "vitest";
import { proposal } from "../../types/Proposal0_1_1";
import { ContractStorage } from "../../types/app";
import { VersionedApi } from "../../versioned/apis";
import deployTzSafe from "../../versioned/deployTzSafe";
import { proposals } from "../../versioned/interface";
import { owner } from "./config";
import { retry } from "./util";

const tenMins = 600000;
const version = "0.1.1";
const ipfs_file = "ipfs://QmYnMTNgRi1cDJ6x6HCtjZwykypPWUSB5epRZ6ySuY5MWk";

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
        const storage: ContractStorage = await retry(() => tzsafe.storage());

        expect(tzsafe.address).toBeDefined();
        expect(storage.threshold.isEqualTo(BigNumber(1))).toBe(true);
        expect(storage.proposal_counter.isEqualTo(BigNumber(0))).toBe(true);
        expect(storage.owners).toEqual([owner]);
        storage.metadata.get("").then((value: string) => {
          expect(value).toEqual(stringToBytes(ipfs_file));
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

        const before_storage: ContractStorage = await retry(() =>
          tzsafe.storage()
        );
        const before_proposal_counter: BigNumber =
          before_storage.proposal_counter;

        const deployed_result = await retry(() =>
          v.submitTxProposals(tzsafe, tezos, proposals)
        );

        const [_, msg] = deployed_result;
        expect(msg.startsWith("op")).toBeDefined();

        const after_storage: ContractStorage = await retry(() =>
          tzsafe.storage()
        );
        const after_proposal_counter: BigNumber =
          after_storage.proposal_counter;

        expect(after_proposal_counter.toNumber()).toBe(
          before_proposal_counter.toNumber() + 1
        );
        after_storage.proposals
          .get(after_proposal_counter.toNumber())
          .then((value: proposal) => {
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

        const before_storage: ContractStorage = await retry(() =>
          tzsafe.storage()
        );
        const before_proposal: proposal = await retry(() =>
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

        const after_storage: ContractStorage = await retry(() =>
          tzsafe.storage()
        );
        const after_proposal: proposal = await retry(() =>
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

        const storage: ContractStorage = await retry(() => tzsafe.storage());

        // in mutez
        expect((await tezos.tz.getBalance(addr)).toNumber()).toBe(3000000);

        await retry(() =>
          v.signProposal(
            tzsafe,
            tezos,
            storage.proposal_counter,
            undefined,
            true
          )
        );

        expect((await tezos.tz.getBalance(addr)).toNumber()).toBe(0);
      },
      { timeout: tenMins }
    );

    it(
      "test submitSettingsProposals and resolve proposal",
      async () => {
        const v = VersionedApi(version, addr);
        const tzsafe = await tezos.wallet.at(addr);

        const before_storage: ContractStorage = await retry(() =>
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

        const after_storage: ContractStorage = await retry(() =>
          tzsafe.storage()
        );
        expect(after_storage.effective_period.toNumber()).toBe(
          before_effectivePeriod.toNumber() + 2
        );
      },
      { timeout: tenMins }
    );
    it(
      "test submitTxProposals: non-supporting proposals will be dropped",
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
              type: "transfer",
              values: {
                to: owner,
                amount: "2",
              },
            },
          ],
        };

        const before_storage: ContractStorage = await retry(() =>
          tzsafe.storage()
        );
        const before_proposal_counter: BigNumber =
          before_storage.proposal_counter;

        const deployed_result = await retry(() =>
          v.submitTxProposals(tzsafe, tezos, proposals)
        );

        const [_, msg] = deployed_result;
        expect(msg.startsWith("op")).toBeDefined();

        const after_storage: ContractStorage = await retry(() =>
          tzsafe.storage()
        );
        const after_proposal_counter: BigNumber =
          after_storage.proposal_counter;

        expect(after_proposal_counter.toNumber()).toBe(
          before_proposal_counter.toNumber() + 1
        );

        after_storage.proposals
          .get(after_proposal_counter.toNumber())
          .then((value: proposal) => {
            expect(value.contents.filter(v => "transfer" in v).length).toBe(1);
          });
      },
      { timeout: tenMins }
    );

    it(
      "test submitTxProposals and sign",
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

        const before_storage: ContractStorage = await retry(() =>
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
        const after_storage: ContractStorage = await retry(() =>
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

        // sign validation
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
      "test submitTxProposals and sign and resolve",
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
        const after_storage: ContractStorage = await retry(() =>
          tzsafe.storage()
        );
        const after_proposal: any = await retry(() =>
          after_storage.proposals.get(after_storage.proposal_counter)
        );
        expect(after_proposal.resolver).toBeDefined();
        const after_balance = await retry(() => tezos.tz.getBalance(addr));
        expect(after_balance.toNumber()).toBe(0);
      },
      { timeout: tenMins }
    );
  });

export default test_suit;
