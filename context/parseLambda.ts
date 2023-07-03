import { Expr, Prim, IntLiteral, emitMicheline } from "@taquito/michel-codec";
import {
  encodePubKey,
  validateAddress,
  ValidationResult,
} from "@taquito/utils";
import { parse } from "path";
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

const parsePattern = <T>(
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
  lambda: Expr[]
):
  | [true, LambdaType, { address: string } | undefined]
  | [false, undefined, undefined] => {
  const delegate_instr_size = 4;

  if (lambda.length != delegate_instr_size)
    return [false, undefined, undefined];

  const fail_parse: [boolean, undefined] = [false, undefined];
  const succ_parse: [boolean, undefined] = [true, undefined];

  // parse DROP
  const [parseDrop] = parsePattern(lambda, 0, "DROP", () => succ_parse);

  // parse PUSH key_hash
  const [parseKeyHash, address] = parseDrop
    ? parsePattern(lambda, 1, "PUSH", expr => {
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
          return fail_parse;
        }
      })
    : fail_parse;

  // parse SOME
  const [parseOpt] = parseKeyHash
    ? parsePattern(lambda, 2, "SOME", () => succ_parse)
    : fail_parse;

  // parse SET_DELEGATE
  const [parseSetDelegate] = parseOpt
    ? parsePattern(lambda, 3, "SET_DELEGATE", () => succ_parse)
    : fail_parse;

  if (parseSetDelegate) {
    return [true, LambdaType.DELEGATE, !!address ? { address } : undefined];
  } else {
    return [false, undefined, undefined];
  }
};

const parseUnDelegate = (
  lambda: Expr[]
): [true, LambdaType] | [false, undefined] => {
  const delegate_instr_size = 3;

  if (lambda.length != delegate_instr_size) return [false, undefined];

  const fail_parse: [boolean, undefined] = [false, undefined];
  const succ_parse: [boolean, undefined] = [true, undefined];

  // parse DROP
  const [parseDrop] = parsePattern(lambda, 0, "DROP", () => succ_parse);

  // parse NONE
  const [parseOpt] = parseDrop
    ? parsePattern(lambda, 1, "NONE", () => succ_parse)
    : fail_parse;

  // parse SET_DELEGATE
  const [parseSetDelegate] = parseOpt
    ? parsePattern(lambda, 2, "SET_DELEGATE", () => succ_parse)
    : fail_parse;

  if (parseSetDelegate) {
    return [true, LambdaType.UNDELEGATE];
  } else {
    return [false, undefined];
  }
};

export const parseLambda = (
  lambda: Expr | null
): [LambdaType, output | undefined] => {
  if (!lambda) return lambdaExec;
  if (!Array.isArray(lambda)) return lambdaExec;

  const [isDelegate, type, delegateData] = parseDelegate(lambda);

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
    const [isUnDelegate, type] = parseUnDelegate(lambda);
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

  // FA1.2 and FA2 is a special case of contract_execution. There number of instrucions is the same as regular contract execution
  const contract_execution_instr_size = 7;
  if (lambda.length != contract_execution_instr_size)
    return [LambdaType.LAMBDA_EXECUTION, undefined];

  const fail_parse: [boolean, undefined] = [false, undefined];
  const succ_parse: [boolean, undefined] = [true, undefined];

  // parse DROP
  const [parseDrop] = parsePattern(lambda, 0, "DROP", () => succ_parse);

  // parse PUSH address
  const [parsePushAddr, contractAddress] = parseDrop
    ? parsePattern(lambda, 1, "PUSH", expr => {
        //@ts-expect-error
        if (expr.args?.[0]?.prim !== "address") {
          return fail_parse;
        } else {
          //@ts-expect-error
          if (!!expr.args?.[1]?.bytes) {
            const addr = encodePubKey(
              //@ts-expect-error
              expr.args[1].bytes
            );

            return validateAddress(addr) === ValidationResult.VALID
              ? [true, addr]
              : fail_parse;
          } else if (
            //@ts-expect-error
            !!expr.args?.[1]?.string
          ) {
            //@ts-expect-error
            return [true, expr.args?.[1]?.string as string];
          } else {
            return fail_parse;
          }
        }
      })
    : fail_parse;

  const [parseContrEp, entrypoint] = parsePushAddr
    ? parsePattern(lambda, 2, "CONTRACT", expr => {
        return [true, parseContractEntrypoint(expr)];
      })
    : fail_parse;

  const [parseIfNone] = parseContrEp
    ? parsePattern(lambda, 3, "IF_NONE", expr => {
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
          return fail_parse;

        if (!(Array.isArray(arg1) && arg1.length == 0)) return fail_parse;

        return succ_parse;
      })
    : fail_parse;

  const [parseMutez, mutez] = parseIfNone
    ? parsePattern(lambda, 4, "PUSH", expr => {
        if (!!expr.args && (expr.args[0] as Prim).prim === "mutez")
          return [true, Number((expr.args[1] as IntLiteral).int)];
        else return fail_parse;
      })
    : fail_parse;

  const entrypointSignature = JSON.stringify(entrypoint);

  const lambdaType = !parseMutez
    ? LambdaType.LAMBDA_EXECUTION
    : entrypointSignature === FA2_SIGNATURE
    ? LambdaType.FA2
    : entrypointSignature === FA1_2_APPROVE_SIGNATURE
    ? LambdaType.FA1_2_APPROVE
    : entrypointSignature === FA1_2_TRANSFER_SIGNATURE
    ? LambdaType.FA1_2_TRANSFER
    : LambdaType.CONTRACT_EXECUTION;

  const [parsePushParam, data] = parseMutez
    ? parsePattern(lambda, 5, "PUSH", expr => {
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
          return fail_parse;
        }
      })
    : fail_parse;

  const [parseTransfer] = parsePushParam
    ? parsePattern(lambda, 6, "TRANSFER_TOKENS", expr => succ_parse)
    : fail_parse;

  if (
    parseTransfer &&
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
};
