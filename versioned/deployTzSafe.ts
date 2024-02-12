import { MichelsonMap, Wallet } from "@taquito/taquito";
import { char2Bytes } from "@taquito/tzip16";
import BigNumber from "bignumber.js";
import fromIpfs from "../context/fromIpfs";
import { CONTRACTS } from "../context/version";
import {
  daoStorage,
  metadata,
  token_metadata,
  total_supply,
} from "../types/app";

type tokenMetadata = {
  token_id: BigNumber;
  decimals: BigNumber;
  name?: string;
  symbol?: string;
};

type ownerAndLiquidity = {
  owner: string;
  quantity: BigNumber;
};

export type settings =
  | {
      type: "multisig";
      version:
        | "0.0.6"
        | "0.0.8"
        | "0.0.9"
        | "0.0.10"
        | "0.0.11"
        | "0.1.1"
        | "0.3.0"
        | "0.3.1"
        | "0.3.2"
        | "0.3.3"
        | "0.3.4";
      owners: string[];
      threshold: number;
      effective_period: number;
    }
  | {
      type: "dao";
      version: "0.4.0";
      token_info: tokenMetadata;
      owners: ownerAndLiquidity[];
      supermajority: BigNumber;
      quorum: BigNumber;
      voting_duration: BigNumber;
      execution_duration: BigNumber;
    };

function createledger(
  token_id: BigNumber,
  ownersAndLiquidity: ownerAndLiquidity[]
): MichelsonMap<{ 0: string; 1: string }, BigNumber> {
  const storageMap: MichelsonMap<{ 0: string; 1: string }, BigNumber> =
    new MichelsonMap();

  ownersAndLiquidity.forEach(({ owner, quantity }) => {
    storageMap.set({ 0: owner, 1: token_id.toString() }, quantity);
  });

  return storageMap;
}

export default async function deployTzSafe(wallet: Wallet, s: settings) {
  const deploying_files = CONTRACTS[s.version];
  if (!deploying_files)
    throw Error(
      `The contract version, ${s.version}, doesn't support for deployment.`
    );

  const [deploying_contract, metadata] = deploying_files;
  const metablob = await fromIpfs(metadata);

  let deploy;

  if (s.type === "multisig") {
    const { type, version, ...others } = s;
    deploy = await wallet
      .originate({
        code: deploying_contract,
        storage: {
          proposal_counter: 0,
          proposals: [],
          archives: [],
          ...others,
          ...metablob,
        },
      })
      .send();
  } else if (s.type === "dao") {
    const token_id = s.token_info.token_id;
    const token_info: MichelsonMap<string, string> = new MichelsonMap();

    token_info.set("token_id", char2Bytes(s.token_info.token_id.toString()));
    token_info.set("decimals", char2Bytes(s.token_info.decimals.toString()));

    if ("name" in s.token_info && s.token_info.name !== undefined)
      token_info.set("name", char2Bytes(s.token_info.name));

    if ("symbol" in s.token_info && s.token_info.symbol !== undefined)
      token_info.set("symbol", char2Bytes(s.token_info.symbol));

    const token_metadata: token_metadata = new MichelsonMap();
    token_metadata.set(token_id, { token_id, token_info });

    const token_total_supply = s.owners.reduce(
      (acc, curr) => acc.plus(curr.quantity),
      new BigNumber(0)
    );
    const total_supply: total_supply = new MichelsonMap();
    total_supply.set(token_id, token_total_supply);

    const storage: daoStorage = {
      fa2: {
        ledger: createledger(token_id, s.owners),
        operators: new MichelsonMap(),
        token_metadata,
        metadata: new MichelsonMap(),
        extension: {
          total_supply,
          lock_table: new MichelsonMap(),
          lock_keys: [],
        },
      },
      wallet: {
        proposal_counter: new BigNumber(0),
        proposals: new MichelsonMap(),
        archives: new MichelsonMap(),
        voting_history: new MichelsonMap(),
        token: new BigNumber(token_id),
        supermajority: new BigNumber(s.supermajority),
        quorum: new BigNumber(s.quorum),
        voting_duration: s.voting_duration,
        execution_duration: s.execution_duration,
      },
      metadata: metablob.metadata as metadata,
    };

    deploy = await wallet
      .originate({
        code: deploying_contract,
        storage,
      })
      .send();
  } else throw Error(`unknown wallet type: settings ${s}`);

  const result = await deploy.contract();
  return result;
}
