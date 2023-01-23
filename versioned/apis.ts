import { contractStorage } from "../types/app";
import { version, proposal } from "../types/display";
import { Versioned } from "./interface";
import Version006 from "./version006";
import Version008 from "./version008";

import { BigNumber } from "bignumber.js";

function signers(c: contractStorage): string[] {
  return Versioned.signers(c);
}
const dispatch: {
  [key in version]: (version: version, address: string) => Versioned;
} = {
  "0.0.6": (version, address) => new Version006(version, address),
  "0.0.8": (version, address) => new Version008(version, address),
  "unknown version": () => {
    throw new Error("not implemented!");
  },
};
const dispatchUi: {
  [key in version]: any;
} = {
  "0.0.6": Version006,
  "0.0.8": Version008,
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
function toProposal(version: version, c: any): proposal {
  return dispatchUi[version].toProposal(c);
}
export { toStorage, signers, toProposal, VersionedApi };
