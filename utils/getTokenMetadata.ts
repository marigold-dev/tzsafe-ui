import { TezosToolkit } from "@taquito/taquito";
import { tzip12 } from "@taquito/tzip12";

export function getTokenMetadata(
  contract: string,
  tokenId: number,
  Tezos: TezosToolkit
) {
  return Tezos.contract
    .at(contract, tzip12)
    .then(contract => contract.tzip12().getTokenMetadata(tokenId));
}
