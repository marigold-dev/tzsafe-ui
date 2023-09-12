import {
  ContractAbstraction,
  ContractProvider,
  Wallet,
} from "@taquito/taquito";
import { Tzip16ContractAbstraction } from "@taquito/tzip16";
import { version } from "../types/display";

declare const ABSTRACTION_KEY: unique symbol;
const dispatch: { [key: string]: version } = {
  "0.0.6": "0.0.6",
  "0.0.8": "0.0.8",
  "0.0.9": "0.0.9",
  "0.0.10": "0.0.10",
  "0.0.11": "0.0.11",
  "0.1.1": "0.1.1",
};

const VERSION_HASH: { [k in version]: string } = {
  "0.0.6": "",
  "0.0.8": "",
  "0.0.9": "",
  "0.0.10": "-357299388-2016479992",
  "0.0.11": "-483287042793087855",
  "0.1.1": "",
  "unknown version": "notanhash",
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
    let metar = await metadata.tzip16().getMetadata();
    let version = metar.metadata.version!;
    return dispatch[version] || "unknown version";
  } catch {
    return "unknown version";
  }
}
export default fetchVersion;
