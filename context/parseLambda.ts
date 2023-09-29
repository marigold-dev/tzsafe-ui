import { Expr, Prim, IntLiteral, emitMicheline } from "@taquito/michel-codec";
import {
  encodePubKey,
  validateAddress,
  ValidationResult,
} from "@taquito/utils";
import { version } from "../types/display";
import { decodeB58 } from "../utils/contractParam";

export type primitiveName = "string" | "number" | "list";

export type primitiveValue = string | number | data[] | primitiveValue[];
export type data = { [k: string]: primitiveValue } | data[] | string;

export type param =
  | { name: string | undefined; type: string }
  | { name: string | undefined; type: "list"; children: param[] }
  | { name: string | undefined; type: "pair"; children: param[] };

export type output = {
  contractAddress: string;
  mutez: number | undefined;
  entrypoint: {
    name: string;
    params: param;
  };
  data: data;
};

export enum LambdaType {
  FA2 = "FA2",
  FA1_2_APPROVE = "FA1_2_APPROVE",
  FA1_2_TRANSFER = "FA1_2_TRANSFER",
  LAMBDA_EXECUTION = "LAMBDA_EXECUTION",
  DELEGATE = "DELEGATE",
  UNDELEGATE = "UNDELEGATE",
  CONTRACT_EXECUTION = "CONTRACT_EXECUTION",
}

const FA2_SIGNATURE =
  '{"name":"transfer","params":{"type":"list","children":[{"type":"pair","children":[{"name":"from_","type":"address"},{"name":"txs","type":"list","children":[{"type":"pair","children":[{"name":"to_","type":"address"},{"type":"pair","children":[{"name":"token_id","type":"nat"},{"name":"amount","type":"nat"}]}]}]}]}]}}';
const FA1_2_TRANSFER_SIGNATURE =
  '{"name":"transfer","params":{"type":"pair","children":[{"name":"from","type":"address"},{"type":"pair","children":[{"name":"to","type":"address"},{"name":"amount","type":"nat"}]}]}}';
const FA1_2_APPROVE_SIGNATURE =
  '{"name":"approve","params":{"type":"pair","children":[{"name":"spender","type":"address"},{"name":"value","type":"nat"}]}}';

const lambdaExec: [LambdaType, output | undefined] = [
  LambdaType.LAMBDA_EXECUTION,
  undefined,
];

const failParse: [boolean, undefined] = [false, undefined];
const succParse: [boolean, undefined] = [true, undefined];

const formatBytes = (bytes: string | undefined): string =>
  bytes?.includes("0x") ? bytes : `0x${bytes}`;

const argToParam = (arg: Prim): param => {
  return {
    name: arg.annots?.[0].replace(/%|:/g, ""),
    type: arg.prim,
    ...(arg.prim === "list" || arg.prim === "pair"
      ? { children: arg.args?.map(v => argToParam(v as Prim)) ?? [] }
      : {}),
  };
};

const parseContractEntrypoint = (entrypoint: Prim): output["entrypoint"] => {
  return {
    name: entrypoint.annots?.[0].replace(/%|:/g, "") ?? "",
    params: !!entrypoint.args?.[0]
      ? argToParam(entrypoint.args[0] as Prim)
      : { name: undefined, type: "unit" },
  };
};

const rawDataToData = (rawData: Expr, currentParam: param): data => {
  if (Array.isArray(rawData))
    return rawData.map((v, i) => {
      if (!("children" in currentParam))
        throw new Error("No children for a list");

      return rawDataToData(v, currentParam.children[0]);
    });

  if ("string" in rawData)
    return { [currentParam.name ?? "value"]: rawData.string };
  else if ("bytes" in rawData)
    return { [currentParam.name ?? "value"]: encodePubKey(rawData.bytes) };
  else if ("int" in rawData)
    return { [currentParam.name ?? "value"]: Number(rawData.int) };

  if (rawData.prim === "list")
    return rawData.args?.map(v => rawDataToData(v, currentParam)) ?? [];
  else if (rawData.prim.toLowerCase() === "pair")
    return (rawData.args ?? []).reduce((acc, current, i) => {
      if (!("children" in currentParam))
        throw new Error("Pair should have children");

      const parsed = rawDataToData(current, currentParam.children[i]);

      return {
        ...acc,
        ...(Array.isArray(parsed)
          ? { [currentParam.children[i].name ?? "value"]: parsed }
          : typeof parsed === "string"
          ? {}
          : parsed),
      };
    }, {});

  return [];
};

const parsePrimPattern = <T>(
  lambda: Expr[],
  idx: number,
  instr: string,
  process: (expr: Prim) => [boolean, T]
): [boolean, T?] => {
  const expr = lambda[idx];
  if (!!expr && "prim" in expr && expr.prim === instr) {
    const [res, v] = process(expr);
    return [true && res, v];
  } else {
    return [false, undefined];
  }
};

const parseDelegate = (
  version: version,
  lambda: Expr[]
):
  | [true, LambdaType, { address: string } | undefined]
  | [false, undefined, undefined] => {
  if (version === "0.3.1") {
    const delegate_instr_size = 6;

    if (lambda.length != delegate_instr_size)
      return [false, undefined, undefined];

    // parse DROP
    const [isDrop] = parsePrimPattern(lambda, 0, "DROP", () => succParse);

    const [isNil] = isDrop
      ? parsePrimPattern(lambda, 1, "NIL", () => succParse)
      : failParse;

    // parse PUSH key_hash
    const [isKeyHash, address] = isNil
      ? parsePrimPattern(lambda, 2, "PUSH", expr => {
          // @ts-expect-error
          if (expr.args?.[0].prim === "key_hash") {
            //@ts-expect-error
            const address = !!expr?.args?.[1].string
              ? //@ts-expect-error
                (expr?.args?.[1].string as string)
              : encodePubKey(
                  //@ts-expect-error
                  formatBytes(expr?.args?.[1].bytes)
                );
            return [true, address];
          } else {
            return failParse;
          }
        })
      : failParse;

    // parse SOME
    const [isOpt] = isKeyHash
      ? parsePrimPattern(lambda, 3, "SOME", () => succParse)
      : failParse;

    // parse SET_DELEGATE
    const [isSetDelegate] = isOpt
      ? parsePrimPattern(lambda, 4, "SET_DELEGATE", () => succParse)
      : failParse;

    const [isCons] = isSetDelegate
      ? parsePrimPattern(lambda, 5, "CONS", () => succParse)
      : failParse;

    if (isCons) {
      return [true, LambdaType.DELEGATE, !!address ? { address } : undefined];
    } else {
      return [false, undefined, undefined];
    }
  } else {
    const delegate_instr_size = 4;

    if (lambda.length != delegate_instr_size)
      return [false, undefined, undefined];

    // parse DROP
    const [isParsedDrop] = parsePrimPattern(lambda, 0, "DROP", () => succParse);

    // parse PUSH key_hash
    const [isParsedKeyHash, address] = isParsedDrop
      ? parsePrimPattern(lambda, 1, "PUSH", expr => {
          // @ts-expect-error
          if (expr.args?.[0].prim === "key_hash") {
            //@ts-expect-error
            const address = !!expr?.args?.[1].string
              ? //@ts-expect-error
                (expr?.args?.[1].string as string)
              : encodePubKey(
                  //@ts-expect-error
                  formatBytes(expr?.args?.[1].bytes)
                );
            return [true, address];
          } else {
            return failParse;
          }
        })
      : failParse;

    // parse SOME
    const [isParsedOpt] = isParsedKeyHash
      ? parsePrimPattern(lambda, 2, "SOME", () => succParse)
      : failParse;

    // parse SET_DELEGATE
    const [isParsedSetDelegate] = isParsedOpt
      ? parsePrimPattern(lambda, 3, "SET_DELEGATE", () => succParse)
      : failParse;

    if (isParsedSetDelegate) {
      return [true, LambdaType.DELEGATE, !!address ? { address } : undefined];
    } else {
      return [false, undefined, undefined];
    }
  }
};

const parseUnDelegate = (
  version: version,
  lambda: Expr[]
): [true, LambdaType] | [false, undefined] => {
  if (version === "0.3.1") {
    const undelegate_instr_size = 5;

    if (lambda.length != undelegate_instr_size) return [false, undefined];

    // parse DROP
    const [isDrop] = parsePrimPattern(lambda, 0, "DROP", () => succParse);

    const [isdNil] = isDrop
      ? parsePrimPattern(lambda, 1, "NIL", () => succParse)
      : failParse;

    // parse NONE
    const [isOpt] = isdNil
      ? parsePrimPattern(lambda, 2, "NONE", () => succParse)
      : failParse;

    // parse SET_DELEGATE
    const [isSetDelegate] = isOpt
      ? parsePrimPattern(lambda, 3, "SET_DELEGATE", () => succParse)
      : failParse;

    // parse SET_DELEGATE
    const [isCons] = isSetDelegate
      ? parsePrimPattern(lambda, 3, "CONS", () => succParse)
      : failParse;

    if (isCons) {
      return [true, LambdaType.UNDELEGATE];
    } else {
      return [false, undefined];
    }
  } else {
    const undelegate_instr_size = 3;

    if (lambda.length != undelegate_instr_size) return [false, undefined];

    // parse DROP
    const [isParsedDrop] = parsePrimPattern(lambda, 0, "DROP", () => succParse);

    // parse NONE
    const [isParsedOpt] = isParsedDrop
      ? parsePrimPattern(lambda, 1, "NONE", () => succParse)
      : failParse;

    // parse SET_DELEGATE
    const [isParsedSetDelegate] = isParsedOpt
      ? parsePrimPattern(lambda, 2, "SET_DELEGATE", () => succParse)
      : failParse;

    if (isParsedSetDelegate) {
      return [true, LambdaType.UNDELEGATE];
    } else {
      return [false, undefined];
    }
  }
};

export const parseLambda = (
  version: version,
  lambda: Expr | null
): [LambdaType, output | undefined] => {
  if (!lambda) return lambdaExec;
  if (!Array.isArray(lambda)) return lambdaExec;

  const [isDelegate, type, delegateData] = parseDelegate(version, lambda);

  if (isDelegate) {
    return [
      type,
      {
        contractAddress: "",
        mutez: undefined,
        entrypoint: {
          name: "",
          params: { name: "", type: "" },
        },
        data: delegateData ?? {},
      },
    ];
  } else {
    const [isUnDelegate, type] = parseUnDelegate(version, lambda);
    if (isUnDelegate) {
      return [
        type,
        {
          contractAddress: "",
          mutez: undefined,
          entrypoint: {
            name: "",
            params: { name: "", type: "" },
          },
          data: {},
        },
      ];
    }
  }

  if (version === "0.3.1") {
    const contract_execution_instr_size = 9;

    if (lambda.length != contract_execution_instr_size)
      return [LambdaType.LAMBDA_EXECUTION, undefined];

    // parse DROP
    const [isDrop] = parsePrimPattern(lambda, 0, "DROP", () => succParse);

    const [isNil] = isDrop
      ? parsePrimPattern(lambda, 1, "NIL", () => succParse)
      : failParse;

    // parse PUSH address
    const [isPushAddr, contractAddress] = isNil
      ? parsePrimPattern(lambda, 2, "PUSH", expr => {
          //@ts-expect-error
          if (expr.args?.[0]?.prim !== "address") {
            return failParse;
          } else {
            //@ts-expect-error
            if (!!expr.args?.[1]?.bytes) {
              const addr = encodePubKey(
                //@ts-expect-error
                expr.args[1].bytes
              );

              return validateAddress(addr) === ValidationResult.VALID
                ? [true, addr]
                : failParse;
            } else if (
              //@ts-expect-error
              !!expr.args?.[1]?.string
            ) {
              //@ts-expect-error
              return [true, expr.args?.[1]?.string as string];
            } else {
              return failParse;
            }
          }
        })
      : failParse;

    // parse CONTRACT
    const [isContract, entrypoint] = isPushAddr
      ? parsePrimPattern(lambda, 3, "CONTRACT", expr => {
          return [true, parseContractEntrypoint(expr)];
        })
      : failParse;

    // parse IF_NONE
    const [isIfNone] = isContract
      ? parsePrimPattern(lambda, 4, "IF_NONE", expr => {
          //@ts-expect-error
          const arg0 = expr.args[0];

          //@ts-expect-error
          const arg1 = expr.args[1];

          if (
            !(
              Array.isArray(arg0) &&
              arg0.length == 2 &&
              "prim" in arg0[0] &&
              arg0[0].prim === "PUSH" &&
              "prim" in arg0[1] &&
              arg0[1].prim === "FAILWITH"
            )
          )
            return failParse;

          if (!(Array.isArray(arg1) && arg1.length == 0)) return failParse;

          return succParse;
        })
      : failParse;

    // parse PUSH mutez
    const [isParsedMutez, mutez] = isIfNone
      ? parsePrimPattern(lambda, 5, "PUSH", expr => {
          if (!!expr.args && (expr.args[0] as Prim).prim === "mutez")
            return [true, Number((expr.args[1] as IntLiteral).int)];
          else return failParse;
        })
      : failParse;

    const entrypointSignature = JSON.stringify(entrypoint);

    const lambdaType = !isParsedMutez
      ? LambdaType.LAMBDA_EXECUTION
      : entrypointSignature === FA2_SIGNATURE
      ? LambdaType.FA2
      : entrypointSignature === FA1_2_APPROVE_SIGNATURE
      ? LambdaType.FA1_2_APPROVE
      : entrypointSignature === FA1_2_TRANSFER_SIGNATURE
      ? LambdaType.FA1_2_TRANSFER
      : LambdaType.CONTRACT_EXECUTION;

    // parse PUSH data
    const [isPushData, data] = isParsedMutez
      ? parsePrimPattern(lambda, 6, "PUSH", expr => {
          if (
            !!entrypoint &&
            JSON.stringify(argToParam(expr.args?.[0]! as Prim)) ===
              JSON.stringify(entrypoint.params)
          ) {
            const data =
              lambdaType === LambdaType.CONTRACT_EXECUTION
                ? !!expr.args?.[1] && !!expr.args?.[0]
                  ? emitMicheline(decodeB58(expr.args?.[0], expr.args?.[1]))
                  : "Unit"
                : rawDataToData(expr.args![1], entrypoint.params);
            return [true, data];
          } else {
            return failParse;
          }
        })
      : failParse;

    // Parse TRANSFER_TOKENS
    const [isTransfer] = isPushData
      ? parsePrimPattern(lambda, 7, "TRANSFER_TOKENS", expr => succParse)
      : failParse;

    const [isCons] = isTransfer
      ? parsePrimPattern(lambda, 8, "CONS", expr => succParse)
      : failParse;

    if (
      isCons &&
      !!contractAddress &&
      !!data &&
      !!entrypoint &&
      mutez !== undefined
    )
      return [
        lambdaType,
        {
          contractAddress,
          entrypoint,
          mutez,
          data,
        },
      ];
    else return lambdaExec;
  } else {
    // FA1.2 and FA2 is a special case of contract_execution. There number of instrucions is the same as regular contract execution
    const contract_execution_instr_size = 7;
    if (lambda.length != contract_execution_instr_size)
      return [LambdaType.LAMBDA_EXECUTION, undefined];

    // parse DROP
    const [isParsedDrop] = parsePrimPattern(lambda, 0, "DROP", () => succParse);

    // parse PUSH address
    const [isParsedPushAddr, contractAddress] = isParsedDrop
      ? parsePrimPattern(lambda, 1, "PUSH", expr => {
          //@ts-expect-error
          if (expr.args?.[0]?.prim !== "address") {
            return failParse;
          } else {
            //@ts-expect-error
            if (!!expr.args?.[1]?.bytes) {
              const addr = encodePubKey(
                //@ts-expect-error
                expr.args[1].bytes
              );

              return validateAddress(addr) === ValidationResult.VALID
                ? [true, addr]
                : failParse;
            } else if (
              //@ts-expect-error
              !!expr.args?.[1]?.string
            ) {
              //@ts-expect-error
              return [true, expr.args?.[1]?.string as string];
            } else {
              return failParse;
            }
          }
        })
      : failParse;

    // parse CONTRACT
    const [isParsedContrEp, entrypoint] = isParsedPushAddr
      ? parsePrimPattern(lambda, 2, "CONTRACT", expr => {
          return [true, parseContractEntrypoint(expr)];
        })
      : failParse;

    // parse IF_NONE
    const [isParsedIfNone] = isParsedContrEp
      ? parsePrimPattern(lambda, 3, "IF_NONE", expr => {
          //@ts-expect-error
          const arg0 = expr.args[0];

          //@ts-expect-error
          const arg1 = expr.args[1];

          if (
            !(
              Array.isArray(arg0) &&
              arg0.length == 2 &&
              "prim" in arg0[0] &&
              arg0[0].prim === "PUSH" &&
              "prim" in arg0[1] &&
              arg0[1].prim === "FAILWITH"
            )
          )
            return failParse;

          if (!(Array.isArray(arg1) && arg1.length == 0)) return failParse;

          return succParse;
        })
      : failParse;

    // parse PUSH mutez
    const [isParsedMutez, mutez] = isParsedIfNone
      ? parsePrimPattern(lambda, 4, "PUSH", expr => {
          if (!!expr.args && (expr.args[0] as Prim).prim === "mutez")
            return [true, Number((expr.args[1] as IntLiteral).int)];
          else return failParse;
        })
      : failParse;

    const entrypointSignature = JSON.stringify(entrypoint);

    const lambdaType = !isParsedMutez
      ? LambdaType.LAMBDA_EXECUTION
      : entrypointSignature === FA2_SIGNATURE
      ? LambdaType.FA2
      : entrypointSignature === FA1_2_APPROVE_SIGNATURE
      ? LambdaType.FA1_2_APPROVE
      : entrypointSignature === FA1_2_TRANSFER_SIGNATURE
      ? LambdaType.FA1_2_TRANSFER
      : LambdaType.CONTRACT_EXECUTION;

    // parse PUSH data
    const [isParsedPushParam, data] = isParsedMutez
      ? parsePrimPattern(lambda, 5, "PUSH", expr => {
          if (
            !!entrypoint &&
            JSON.stringify(argToParam(expr.args?.[0]! as Prim)) ===
              JSON.stringify(entrypoint.params)
          ) {
            const data =
              lambdaType === LambdaType.CONTRACT_EXECUTION
                ? !!expr.args?.[1] && !!expr.args?.[0]
                  ? emitMicheline(decodeB58(expr.args?.[0], expr.args?.[1]))
                  : "Unit"
                : rawDataToData(expr.args![1], entrypoint.params);
            return [true, data];
          } else {
            return failParse;
          }
        })
      : failParse;

    // Parse TRANSFER_TOKENS
    const [isParsedTransfer] = isParsedPushParam
      ? parsePrimPattern(lambda, 6, "TRANSFER_TOKENS", expr => succParse)
      : failParse;

    if (
      isParsedTransfer &&
      !!contractAddress &&
      !!data &&
      !!entrypoint &&
      mutez !== undefined
    )
      return [
        lambdaType,
        {
          contractAddress,
          entrypoint,
          mutez,
          data,
        },
      ];
    else return lambdaExec;
  }
};
