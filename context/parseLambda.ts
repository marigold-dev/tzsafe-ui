import { Expr, Prim } from "@taquito/michel-codec";
import {
  encodePubKey,
  validateAddress,
  ValidationResult,
} from "@taquito/utils";

export type primitiveName = "string" | "number" | "list";

export type primitiveValue = string | number | data[] | primitiveValue[];
export type data = { [k: string]: primitiveValue } | data[];

export type param =
  | { name: string | undefined; type: string }
  | { name: string | undefined; type: "list"; children: param[] }
  | { name: string | undefined; type: "pair"; children: param[] };

export type output = {
  contractAddress: string;
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
    name: entrypoint.annots![0].replace(/%|:/g, ""),
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
          : parsed),
      };
    }, {});

  return [];
};

const parseDelegate = (
  lambda: Expr[]
):
  | [true, LambdaType, { address: string } | undefined]
  | [false, undefined, undefined] => {
  console.log(lambda);
  if (!lambda.find(expr => "prim" in expr && expr.prim === "SET_DELEGATE"))
    return [false, undefined, undefined];

  const type = !!lambda.find(
    expr =>
      "prim" in expr &&
      expr.prim === "PUSH" &&
      // @ts-expect-error
      expr.args?.[0].prim === "key_hash"
  )
    ? LambdaType.DELEGATE
    : LambdaType.UNDELEGATE;

  const address = (() => {
    if (type !== LambdaType.DELEGATE) return;

    const expr = lambda.find(
      expr =>
        "prim" in expr &&
        expr.prim === "PUSH" &&
        // @ts-expect-error
        expr.args?.[0].prim === "key_hash"
    ) as Prim | undefined;

    //@ts-expect-error
    return !!expr?.args?.[1].string
      ? //@ts-expect-error
        (expr?.args?.[1].string as string)
      : //@ts-expect-error
        encodePubKey(expr?.args?.[1].bytes);
  })();

  return [true, type, !!address ? { address } : undefined];
};

export const parseLambda = (
  lambda: Expr | null
): [LambdaType, output | undefined] => {
  if (!lambda) return lambdaExec;
  if (!Array.isArray(lambda)) return lambdaExec;

  const [isDelegate, type, delegateData] = parseDelegate(lambda);

  if (isDelegate)
    return [
      type,
      {
        contractAddress: "",
        entrypoint: {
          name: "",
          params: { name: "", type: "" },
        },
        data: delegateData ?? {},
      },
    ];

  const contractAddress = (() => {
    const expr = lambda.find(expr => {
      if (!("prim" in expr)) return false;

      const { prim, args } = expr;

      //@ts-expect-error
      if (prim !== "PUSH" || args?.[0]?.prim !== "address") return false;

      //@ts-expect-error
      if (!!args?.[1]?.bytes) {
        return (
          //@ts-expect-error
          validateAddress(encodePubKey(`0x${args[1].bytes}`)) ===
          ValidationResult.VALID
        );
      }

      //@ts-expect-error
      return !!args?.[1]?.string;
    });

    if (!expr) return undefined;

    //@ts-expect-error
    return !!(expr as Prim).args![1].string
      ? //@ts-expect-error
        ((expr as Prim).args![1].string as string)
      : //@ts-expect-error
        encodePubKey((expr as Prim).args![1].bytes);
  })();

  const rawEntrypoint = (() => {
    const expr = lambda.find(expr => {
      if (!("prim" in expr)) return false;

      return expr.prim === "CONTRACT" && !!expr.annots?.[0];
    });

    return expr as Prim | undefined;
  })();

  if (!rawEntrypoint) return lambdaExec;

  const entrypoint = parseContractEntrypoint(rawEntrypoint);

  const data = (() => {
    const expr = lambda.find(expr => {
      if (!("prim" in expr) || expr.prim !== "PUSH") return false;

      return (
        JSON.stringify(argToParam(expr.args?.[0]! as Prim)) ===
        JSON.stringify(entrypoint.params)
      );
    });

    return expr as Prim | undefined;
  })();

  if (!contractAddress || !data) return lambdaExec;

  const entrypointSignature = JSON.stringify(entrypoint);

  return [
    entrypointSignature === FA2_SIGNATURE
      ? LambdaType.FA2
      : entrypointSignature === FA1_2_APPROVE_SIGNATURE
      ? LambdaType.FA1_2_APPROVE
      : entrypointSignature === FA1_2_TRANSFER_SIGNATURE
      ? LambdaType.FA1_2_TRANSFER
      : LambdaType.LAMBDA_EXECUTION,
    {
      contractAddress,
      entrypoint,
      data: rawDataToData(data.args![1], entrypoint.params),
    },
  ];
};
