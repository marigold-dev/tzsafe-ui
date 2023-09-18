import {
  ContractAbstraction,
  ContractProvider,
  Wallet,
} from "@taquito/taquito";
import { Tzip16ContractAbstraction } from "@taquito/tzip16";
import { version } from "../types/display";
import { API_URL } from "./config";

declare const ABSTRACTION_KEY: unique symbol;
const dispatch: { [key: string]: version } = {
  "0.0.6": "0.0.6",
  "0.0.8": "0.0.8",
  "0.0.9": "0.0.9",
  "0.0.10": "0.0.10",
  "0.0.11": "0.0.11",
  "0.1.1": "0.1.1",
  "0.3.0": "0.3.0",
};

// Those values are from tzkt api: /v1/contracts
type typeHash = string;
type codeHash = string;

// Before 0.0.11, the version is stored on the contract so tzip16 won't failed to retrieve it
// typeHash and codeHash are provided by tzkt API
const VERSION_HASH: { [k: `${typeHash}:${codeHash}`]: version } = {
  "-483287042:521053333": "0.0.11",
  "-483287042:-426350137": "0.1.1",
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
    const version = await metadata
      .tzip16()
      .getMetadata()
      .then(metadata => metadata.metadata.version ?? "unknown version")
      .catch(_ =>
        fetch(`${API_URL}/v1/contracts?address=${metadata.address}`)
          .then(r => r.json())
          .then(
            ([{ typeHash, codeHash }]: {
              typeHash: number;
              codeHash: number;
            }[]) => VERSION_HASH[`${typeHash}:${codeHash}`] ?? "unknown version"
          )
      );

    return dispatch[version] ?? "unknown version";
  } catch {
    return "unknown version";
  }
}
export default fetchVersion;
