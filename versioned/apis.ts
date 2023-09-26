import {
  Expr,
  Prim,
  BytesLiteral,
  IntLiteral,
  Parser,
} from "@taquito/michel-codec";
import { ParameterSchema } from "@taquito/michelson-encoder";
import { MichelsonMap } from "@taquito/taquito";
import { encodePubKey } from "@taquito/utils";
import { BigNumber } from "bignumber.js";
import { contractStorage } from "../types/app";
import { version, proposal } from "../types/display";
import { Versioned } from "./interface";
import Version0_0_6 from "./version0_0_6";
import Version0_0_8 from "./version0_0_8";
import Version0_0_9 from "./version0_0_9";
import Version0_0_10 from "./version0_0_10";
import Version0_0_11 from "./version0_0_11";
import Version0_1_1 from "./version0_1_1";
import Version0_3_0 from "./version0_3_0";
import Version0_3_1 from "./version0_3_1";

function signers(c: contractStorage): string[] {
  return Versioned.signers(c);
}
const dispatch: {
  [key in version]: (version: version, address: string) => Versioned;
} = {
  "0.0.6": (version, address) => new Version0_0_6(version, address),
  "0.0.8": (version, address) => new Version0_0_8(version, address),
  "0.0.9": (version, address) => new Version0_0_9(version, address),
  "0.0.10": (version, address) => new Version0_0_10(version, address),
  "0.0.11": (version, address) => new Version0_0_11(version, address),
  "0.1.1": (version, address) => new Version0_1_1(version, address),
  "0.3.0": (version, address) => new Version0_3_0(version, address),
  "0.3.1": (version, address) => new Version0_3_1(version, address),
  "unknown version": () => {
    throw new Error("not implemented!");
  },
};
const dispatchUi: {
  [key in version]: any;
} = {
  "0.0.6": Version0_0_6,
  "0.0.8": Version0_0_8,
  "0.0.9": Version0_0_9,
  "0.0.10": Version0_0_10,
  "0.0.11": Version0_0_11,
  "0.1.1": Version0_1_1,
  "0.3.0": Version0_3_0,
  "0.3.1": Version0_3_1,
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
    return x.map(x => map2Object(x));
  }
  if (
    typeof x === "object" &&
    Object.keys(x).length === 1 &&
    typeof x[Object.keys(x)[0]] === "symbol"
  ) {
    return { [Object.keys(x)[0]]: {} };
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

let lambdaTable: {
  [key: string]: <acc, t extends Expr>(acc: acc, item: t) => acc;
} = {
  "0.DROP": acc => acc,
  "1.PUSH": (acc, item) => {
    let expr = cast<Prim>(item).args![1];
    let addr = cast<BytesLiteral>(expr).bytes;
    return {
      ...acc,
      contract_address: encodePubKey(addr),
    };
  },
  "2.CONTRACT": (acc, item) => {
    let expr = cast<Prim>(item).args![0];
    let rest = cast<Prim>(item).annots
      ? { ...acc, entrypoint: (cast<Prim>(item).annots as any)[0] }
      : acc;
    return {
      ...rest,
      typ: new ParameterSchema(expr),
    };
  },
  "3.IF_NONE": acc => acc,
  "4.PUSH": (acc, item) => {
    let expr = cast<Prim>(item).args![1];
    let amount = cast<IntLiteral>(expr).int;
    return {
      ...acc,
      mutez_amount: amount,
    };
  },
  "5.PUSH": (acc, item) => {
    let expr = cast<Prim>(item).args![1];
    let payload = cast<Prim>(expr);
    let { typ, ...rest } = cast<{ typ: ParameterSchema } & any>(acc);
    let data = typ.Execute(payload);
    return {
      ...rest,
      payload: map2Object(data),
    };
  },
  "6.TRANSFER_TOKENS": (acc, item) => {
    if ("args" in item) {
      throw new Error("invalid");
    }
    return acc;
  },
};
function cast<A>(x: any): A {
  return x as A;
}
function matchLambda<acc extends { [key: string]: acc[typeof key] }>(
  acc: acc,
  items: []
): { [key: string]: any } | null {
  try {
    let p = new Parser();
    let lam = cast<Array<Expr>>(p.parseJSON(items));

    let result = lam.reduce(
      (acc, item, idx) =>
        lambdaTable[`${idx}.${cast<Prim>(item).prim}`](acc, item),
      acc
    );
    return result;
  } catch {
    return null;
  }
}

export {
  toStorage,
  signers,
  toProposal,
  VersionedApi,
  getProposalsId,
  map2Object,
  matchLambda,
};
