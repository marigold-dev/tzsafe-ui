import { InMemorySigner } from "@taquito/signer";
import { MichelsonMap, TezosToolkit } from "@taquito/taquito";
import { char2Bytes } from "@taquito/tzip16";
import BigNumber from "bignumber.js";
import { describe, expect, it, beforeAll, vi } from "vitest";
import { contractStorage } from "../../types/app";
import { VersionedApi } from "../../versioned/apis";
import deployTzSafe from "../../versioned/deployTzSafe";
import { proposals } from "../../versioned/interface";

const sixMins = 360000;
const version = "0.3.3";

async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let attempts = 0;
  while (true) {
    try {
      const a = await fn();
      return a;
    } catch (error) {
      if (++attempts === maxRetries) throw error;
      console.log(`retry ... ${attempts}/${maxRetries}\nError: ${error}`);
    }
  }
}

vi.mock("@airgap/beacon-sdk", () => ({
  NetworkType: {
    MAINNET: "mainnet",
    GHOSTNET: "ghostnet",
  },
}));

describe("Test version 0.3.3", () => {
  let Tezos: TezosToolkit;
  let addr: string;
  const owner = "tz1inzFwAjE4oWXMabJFZdPHoDQN5S4XB3wH";

  beforeAll(async () => {
    Tezos = new TezosToolkit("https://ghostnet.tezos.marigold.dev/");
    Tezos.setProvider({
      signer: new InMemorySigner(
        "edskRicjCbdgMeQ61XWCxAVgTfy6hfxwocXbVgJpynXvoWF8Z8wuzZTvEyiqwnE3cb75u9s8PKCeBG25Zd797NGfK8yfZY5noK"
      ),
    });
  });

  it(
    "test originate tzsafe",
    async () => {
      const tzsafe = await retry(() =>
        deployTzSafe(Tezos.wallet, [owner], 1, 864000, version)
      );
      addr = tzsafe.address;
      const storage: contractStorage = await retry(() => tzsafe.storage());

      expect(tzsafe.address).toBeDefined();
      expect(storage.threshold.isEqualTo(BigNumber(1))).toBe(true);
      expect(storage.proposal_counter.isEqualTo(BigNumber(0))).toBe(true);
      expect(storage.owners).toEqual([owner]);
      storage.metadata.get("").then((value: string) => {
        expect(value).toEqual(
          char2Bytes("ipfs://Qmb72YHLm2jztSQS1B2uEvo1GrWbYKQu7dnJ5YNcS7aU1Q")
        );
      });
    },
    { timeout: sixMins }
  );

  it(
    "test submitTxProposals",
    async () => {
      const v = VersionedApi(version, addr);
      const tzsafe = await retry(() => Tezos.wallet.at(addr));
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
        v.submitTxProposals(tzsafe, Tezos, proposals)
      );

      const [_, msg] = deployed_result;
      expect(msg.startsWith("o")).toBeDefined();

      const after_storage: contractStorage = await retry(() =>
        tzsafe.storage()
      );
      const after_proposal_counter: BigNumber = after_storage.proposal_counter;

      expect(
        after_proposal_counter.isGreaterThan(before_proposal_counter)
      ).toBe(true);
      after_storage.proposals
        .get(after_proposal_counter.toNumber())
        .then((value: any) => {
          expect(value).toBeDefined();
          expect(value.contents.length).toBe(2);
        });
    },
    { timeout: sixMins }
  );

  it(
    "test signProposal to sign proposal only",
    async () => {
      const v = VersionedApi(version, addr);
      const tzsafe = await Tezos.wallet.at(addr);

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
          Tezos,
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
    { timeout: sixMins }
  );
});
