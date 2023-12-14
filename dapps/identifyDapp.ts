import { NetworkType } from "@airgap/beacon-sdk";
import { PREFERED_NETWORK } from "../context/config";
import { tezosDomainsContractsMatcher } from "./tezosDomains";

export enum Dapp {
  TEZOS_DOMAINS = "TEZOS_DOMAINS",
}

export function identifyDapp(contract: string): Dapp | undefined {
  if (
    (PREFERED_NETWORK === NetworkType.MAINNET
      ? tezosDomainsContractsMatcher.mainnet
      : tezosDomainsContractsMatcher.ghostnet)[contract]
  ) {
    return Dapp.TEZOS_DOMAINS;
  } else {
    return undefined;
  }
}
