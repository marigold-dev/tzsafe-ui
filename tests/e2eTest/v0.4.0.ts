import { MichelsonMap, TezosToolkit } from "@taquito/taquito";
import { char2Bytes } from "@taquito/tzip16";
import BigNumber from "bignumber.js";
import { describe, expect, it, beforeAll } from "vitest";
import { contractStorage } from "../../types/app";
import { VersionedApi } from "../../versioned/apis";
import deployTzSafe, { settings } from "../../versioned/deployTzSafe";
import { proposals } from "../../versioned/interface";
import { owner } from "./config";
import { retry } from "./util";

const tenMins = 600000;
const version = "0.4.0";

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
        const settings: settings = {
          type: "dao",
          version,
          token_info: {
            token_id: 1,
            decimals: 6,
            name: "testDao",
            symbol: "testDao",
          },
          owners: [
            { owner, quantity: new BigNumber(100) },
            {
              owner: "tz1inzFwAjE4oWXMabJFZdPHoDQN5S4XB3wH",
              quantity: new BigNumber(200),
            },
          ],
          supermajority: 80,
          quorum: 80,
          voting_duration: new BigNumber(300000),
          execution_duration: new BigNumber(300000),
        };
        const tzsafe = await retry(() => deployTzSafe(tezos.wallet, settings));
        addr = tzsafe.address;
        console.log(`${version} is deployed, ${addr}`);
        const storage: contractStorage = await retry(() => tzsafe.storage());

        expect(tzsafe.address).toBeDefined();
        expect(storage.wallet.proposal_counter.isEqualTo(BigNumber(0))).toBe(
          true
        );
        expect(storage.wallet.token.isEqualTo(BigNumber(1))).toBe(true);
        expect(storage.wallet.supermajority.isEqualTo(BigNumber(80))).toBe(
          true
        );
        expect(storage.wallet.quorum.isEqualTo(BigNumber(80))).toBe(true);
        expect(
          storage.wallet.voting_duration.isEqualTo(BigNumber(300000))
        ).toBe(true);
        expect(
          storage.wallet.execution_duration.isEqualTo(BigNumber(300000))
        ).toBe(true);
        expect(storage.fa2.extension.lock_keys).toStrictEqual([]);

        const actual_supply: BigNumber = await retry(() =>
          storage.fa2.extension.total_supply.get(1)
        );
        expect(actual_supply.isEqualTo(BigNumber(300))).toBe(true);

        const owner1: BigNumber = await retry(() =>
          storage.fa2.ledger.get({ 0: owner, 1: BigNumber(1) })
        );
        expect(owner1.isEqualTo(100)).toBe(true);

        const owner2: BigNumber = await retry(() =>
          storage.fa2.ledger.get({
            0: "tz1inzFwAjE4oWXMabJFZdPHoDQN5S4XB3wH",
            1: BigNumber(1),
          })
        );
        expect(owner2.isEqualTo(200)).toBe(true);

        const token_metadata: {
          token_id: BigNumber;
          token_info: MichelsonMap<string, string>;
        } = await retry(() => storage.fa2.token_metadata.get(BigNumber(1)));

        expect(token_metadata.token_id.isEqualTo(BigNumber(1))).toBe(true);

        expect(token_metadata.token_info.get("token_id")).toBe(char2Bytes("1"));
        expect(token_metadata.token_info.get("decimals")).toBe(char2Bytes("6"));
        expect(token_metadata.token_info.get("name")).toBe(
          char2Bytes("testDao")
        );
        expect(token_metadata.token_info.get("symbol")).toBe(
          char2Bytes("testDao")
        );

        // TODO
        //storage.metadata.get("").then((value: string) => {
        //  expect(value).toEqual(char2Bytes(ipfs_file));
        //});
      },
      { timeout: tenMins }
    );
  });

export default test_suit;
