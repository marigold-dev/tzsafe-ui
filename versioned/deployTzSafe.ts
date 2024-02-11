import { MichelsonMap, Wallet } from "@taquito/taquito";
import { char2Bytes } from "@taquito/tzip16";
import BigNumber from "bignumber.js";
import fromIpfs from "../context/fromIpfs";
import { CONTRACTS } from "../context/version";

type tokenMetadata = {
  token_id: number;
  decimals: number;
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
      supermajority: number;
      quorum: number;
      voting_duration: BigNumber;
      execution_duration: BigNumber;
    };

function numberToBytes32(num: number): Uint8Array {
  const arrayBuffer = new ArrayBuffer(4); // 4 bytes for a 32-bit number
  const view32 = new Uint32Array(arrayBuffer);
  view32[0] = num;
  const view8 = new Uint8Array(arrayBuffer);
  return view8;
}

function createledger(
  token_id: number,
  ownersAndLiquidity: ownerAndLiquidity[]
): MichelsonMap<any, any> {
  const storageMap = new MichelsonMap();

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
    const total_supply = s.owners.reduce(
      (acc, curr) => acc.plus(curr.quantity),
      new BigNumber(0)
    );
    const token_id = s.token_info.token_id;
    const token_info = new MichelsonMap();

    token_info.set("token_id", char2Bytes(s.token_info.token_id.toString()));
    token_info.set("decimals", char2Bytes(s.token_info.decimals.toString()));

    if ("name" in s.token_info && s.token_info.name !== undefined)
      token_info.set("name", char2Bytes(s.token_info.name));

    if ("symbol" in s.token_info && s.token_info.symbol !== undefined)
      token_info.set("symbol", char2Bytes(s.token_info.symbol));

    const r_token_metadata: Record<number, Record<any, any>> = {};
    r_token_metadata[token_id] = { token_id, token_info };

    const r_total_supply: Record<number, BigNumber> = {};
    r_total_supply[token_id] = total_supply;
    deploy = await wallet
      .originate({
        code: deploying_contract,
        storage: {
          fa2: {
            ledger: createledger(token_id, s.owners),
            operators: [],
            token_metadata: MichelsonMap.fromLiteral(r_token_metadata),
            metadata: [],
            extension: {
              total_supply: MichelsonMap.fromLiteral(r_total_supply),
              lock_table: [],
              lock_keys: [],
            },
          },
          wallet: {
            proposal_counter: 0,
            proposals: [],
            archives: [],
            voting_history: [],
            token: token_id,
            supermajority: s.supermajority,
            quorum: s.quorum,
            voting_duration: s.voting_duration,
            execution_duration: s.execution_duration,
          },
          ...metablob,
        },
      })
      .send();
  } else throw Error(`unknown wallet type: settings ${s}`);

  const result = await deploy.contract();
  return result;
}
