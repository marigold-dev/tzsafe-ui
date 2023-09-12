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
};

const VERSION_HASH: { [k: string]: version } = {
  "-357299388-2016479992": "0.0.10",
  "-483287042793087855": "0.0.11",
  "-483287042-426350137": "0.1.1",
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
            }[]) => VERSION_HASH[`${typeHash}${codeHash}`] ?? "unknown version"
          )
      );

    return dispatch[version] ?? "unknown version";
  } catch {
    return "unknown version";
  }
}
export default fetchVersion;

// async function fetchVersion(address: string): Promise<version> {
//   try {
// const { typeHash, codeHash } = (await fetch(
// `${API_URL}/v1/contracts?address=${address}`
// ).then(r => r.json())) as { typeHash: number; codeHash: number };

//     return VERSION_HASH[`${typeHash}${codeHash}`] ?? "unknown version";
//   } catch {
//     return "unknown version";
//   }
// }
// export default fetchVersion;
