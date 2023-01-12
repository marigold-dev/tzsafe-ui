import {
  BigMapAbstraction,
  ContractAbstraction,
  ContractProvider,
  TzReadProvider,
  Wallet,
} from "@taquito/taquito";
import { Tzip16ContractAbstraction } from "@taquito/tzip16";
import { hex2buf } from "@taquito/utils";
declare const ABSTRACTION_KEY: unique symbol;

async function fetchVersion(
  metadata: ContractAbstraction<ContractProvider> & {
    tzip16(
      this: ContractAbstraction<ContractProvider | Wallet> & {
        [ABSTRACTION_KEY]?: Tzip16ContractAbstraction;
      }
    ): Tzip16ContractAbstraction;
  }
): Promise<string> {
  try {
    let metar = await metadata.tzip16().getMetadata();
    return metar.metadata.version!;
  } catch {
    return "unknown version";
  }
}
export default fetchVersion;
