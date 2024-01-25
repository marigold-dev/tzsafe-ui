import { NetworkType } from "@airgap/beacon-sdk";
import { PREFERED_NETWORK } from "../context/config";
import { objktContractsMatcher } from "./objkt";
import { tezosDomainsContractsMatcher } from "./tezosDomains";

export enum Dapp {
  TEZOS_DOMAINS = "TEZOS_DOMAINS",
  OBJKT = "OBJKT",
}

export function identifyDapp(contract: string): Dapp | undefined {
  if (
    (PREFERED_NETWORK === NetworkType.MAINNET
      ? tezosDomainsContractsMatcher.mainnet
      : tezosDomainsContractsMatcher.ghostnet)[contract]
  ) {
    return Dapp.TEZOS_DOMAINS;
  } else if (
    (PREFERED_NETWORK === NetworkType.MAINNET
      ? objktContractsMatcher.mainnet
      : objktContractsMatcher.ghostnet)[contract]
  ) {
    return Dapp.OBJKT;
  } else {
    return undefined;
  }
}
