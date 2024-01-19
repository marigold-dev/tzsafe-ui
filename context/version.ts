import {
  ContractAbstraction,
  ContractProvider,
  Wallet,
  WalletContract,
} from "@taquito/taquito";
import { Tzip16ContractAbstraction } from "@taquito/tzip16";
import { version } from "../types/display";
import { TZKT_API_URL } from "./config";
import ct0_1_1 from "./contract/v0.1.1";
import ct0_3_3 from "./contract/v0.3.3";
import ct0_3_4 from "./contract/v0.3.4";
import meta0_1_1 from "./metadata/v0.1.1";
import meta0_3_3 from "./metadata/v0.3.3";
import meta0_3_4 from "./metadata/v.0.3.4";

declare const ABSTRACTION_KEY: unique symbol;
const dispatch: { [key: string]: version } = {
  "0.0.6": "0.0.6",
  "0.0.8": "0.0.8",
  "0.0.9": "0.0.9",
  "0.0.10": "0.0.10",
  "0.0.11": "0.0.11",
  "0.1.1": "0.1.1",
  "0.3.0": "0.3.0",
  "0.3.1": "0.3.1",
  "0.3.2": "0.3.2",
  "0.3.3": "0.3.3",
  "0.3.4": "0.3.4",
};

// undefined means tzsafe does not support deploying that version
export const CONTRACTS: {
  [k in version]: [constractCode: string, metadata: any] | undefined;
} = {
  "0.0.6": undefined,
  "0.0.8": undefined,
  "0.0.9": undefined,
  "0.0.10": undefined,
  "0.0.11": undefined,
  //@ts-expect-error There was 2 versions of 0.0.11, so it means 2 codeHash.
  "0.0.11b": undefined,
  "0.1.1": [ct0_1_1, meta0_1_1],
  "0.3.0": undefined,
  "0.3.1": undefined,
  "0.3.2": undefined,
  "0.3.3": [ct0_3_3, meta0_3_3],
  "0.3.4": [ct0_3_4, meta0_3_4],
  "unknown version": undefined,
};

// Those values are from tzkt api: /v1/contracts
type typeHash = string;
type codeHash = string;

const HASHES: { [k in version]: `${typeHash}:${codeHash}` | undefined } = {
  "0.0.6": "1047066606:471411811",
  "0.0.8": "2045366626:-1526481454",
  "0.0.9": "1273323151:735333822",
  "0.0.10": "-357299388:2102290129",
  "0.0.11": "-483287042:521053333",
  //@ts-expect-error There was 2 versions of 0.0.11, so it means 2 codeHash
  "0.0.11b": "-483287042:793087855",
  "0.1.1": "-483287042:-426350137",
  "0.3.0": "-933474574:1358594366",
  "0.3.1": "1576695458:46756700",
  "0.3.2": "66001562:-1892417854",
  "0.3.3": "-623288749:1866000220",
  "0.3.4": "1138255963:-521664810",
  "unknown version": undefined,
};

// typeHash and codeHash are provided by tzkt API
const VERSION_HASH: { [k: `${typeHash}:${codeHash}`]: version } = {
  [HASHES["0.0.6"]!]: "0.0.6",
  [HASHES["0.0.8"]!]: "0.0.8",
  [HASHES["0.0.9"]!]: "0.0.9",
  [HASHES["0.0.10"]!]: "0.0.10",
  [HASHES["0.0.11"]!]: "0.0.11",
  //@ts-expect-error - This version only exist on ghostnet
  [HASHES["0.0.11b"]!]: "0.0.11",
  [HASHES["0.1.1"]!]: "0.1.1",
  [HASHES["0.3.0"]!]: "0.3.0",
  [HASHES["0.3.1"]!]: "0.3.1",
  [HASHES["0.3.2"]!]: "0.3.2",
  [HASHES["0.3.3"]!]: "0.3.3",
  [HASHES["0.3.4"]!]: "0.3.4",
};

async function fetchVersion(
  metadata: WalletContract & {
    tzip16(
      this: ContractAbstraction<ContractProvider | Wallet> & {
        [ABSTRACTION_KEY]?: Tzip16ContractAbstraction;
      }
    ): Tzip16ContractAbstraction;
  }
): Promise<version> {
  try {
    let version = await fetch(
      `${TZKT_API_URL}/v1/contracts?address=${metadata.address}`
    )
      .then(r => r.json())
      .then(
        ([{ typeHash, codeHash }]: {
          typeHash: number;
          codeHash: number;
        }[]) => {
          return VERSION_HASH[`${typeHash}:${codeHash}`] ?? "unknown version";
        }
      );

    return dispatch[version] ?? "unknown version";
  } catch {
    return "unknown version";
  }
}
export default fetchVersion;
