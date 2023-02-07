import { contractStorage } from "../types/app";
import { version, proposal } from "../types/display";
import { Versioned } from "./interface";
import Version006 from "./version006";
import Version008 from "./version008";

import { BigNumber } from "bignumber.js";
import Version009 from "./version009";
import { MichelsonMap } from "@taquito/taquito";
function signers(c: contractStorage): string[] {
  return Versioned.signers(c);
}
const dispatch: {
  [key in version]: (version: version, address: string) => Versioned;
} = {
  "0.0.6": (version, address) => new Version006(version, address),
  "0.0.8": (version, address) => new Version008(version, address),
  "0.0.9": (version, address) => new Version009(version, address),
  "unknown version": () => {
    throw new Error("not implemented!");
  },
};
const dispatchUi: {
  [key in version]: any;
} = {
  "0.0.6": Version006,
  "0.0.8": Version008,
  "0.0.9": Version008,
  "unknown version": () => {
    throw new Error("not implemented!");
  },
};
function VersionedApi(version: version, contractAddress: string): Versioned {
  return dispatch[version](version, contractAddress);
}
function toStorage(
  version: version,
  c: any,
  balance: BigNumber
): contractStorage {
  return dispatchUi[version].toContractState(c, balance);
}
function getProposalsId(version: version, c: any): string {
  return dispatchUi[version].getProposalsId(c);
}
function toProposal(version: version, c: any): proposal {
  return dispatchUi[version].toProposal(c);
}
function map2Object(x: any): any {
  if (Array.isArray(x)) {
    return x.map((x) => map2Object(x));
  }
  if (x instanceof MichelsonMap) {
    return Object.fromEntries([...x.entries()]);
  }
  if (x instanceof BigNumber) {
    return x.toString();
  }
  if (typeof x == "object" && !isNaN(Number(Object.keys(x)[0]))) {
    return Object.entries(x).map(([_, v]) => map2Object(v));
  }
  if (typeof x == "object") {
    return Object.fromEntries(
      Object.entries(x).map(([k, v]) => [map2Object(k), map2Object(v)])
    );
  }

  return x;
}
export {
  toStorage,
  signers,
  toProposal,
  VersionedApi,
  getProposalsId,
  map2Object,
};
