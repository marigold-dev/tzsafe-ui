import {
  ContractAbstraction,
  ContractProvider,
  Wallet,
} from "@taquito/taquito";
import { Tzip16ContractAbstraction } from "@taquito/tzip16";
import { version } from "../types/display";
import { TZKT_API_URL } from "./config";

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
};

// Those values are from tzkt api: /v1/contracts
type typeHash = string;
type codeHash = string;

const HASHES: { [k in version]: `${typeHash}:${codeHash}` | undefined } = {
  "0.0.6": undefined,
  "0.0.8": undefined,
  "0.0.9": undefined,
  "0.0.10": undefined,
  "0.0.11": "-483287042:521053333",
  "0.1.1": "-483287042:-426350137",
  "0.3.0": "-933474574:1358594366",
  "0.3.1": "1576695458:46756700",
  "unknown version": undefined,
};

// Before 0.0.11, the version is stored on the contract so tzip16 won't failed to retrieve it
// typeHash and codeHash are provided by tzkt API
const VERSION_HASH: { [k: `${typeHash}:${codeHash}`]: version } = {
  [HASHES["0.0.11"]!]: "0.0.11",
  [HASHES["0.1.1"]!]: "0.1.1",
  [HASHES["0.3.0"]!]: "0.3.0",
  [HASHES["0.3.1"]!]: "0.3.1",
};

async function fetchVersion(
  metadata: ContractAbstraction<ContractProvider> & {
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
        }[]) => VERSION_HASH[`${typeHash}:${codeHash}`] ?? "unknown version"
      );

    if (version === "unknown version") {
      version = (await metadata
        .tzip16()
        .getMetadata()
        .then(metadata => {
          return metadata?.metadata?.version ?? "unknown version";
        })) as version;
    }

    return dispatch[version] ?? "unknown version";
  } catch {
    return "unknown version";
  }
}
export default fetchVersion;
