import { emitMicheline, Parser, Expr } from "@taquito/michel-codec";
import { TokenSchema, Schema } from "@taquito/michelson-encoder";
import {
  ContractAbstraction,
  ContractProvider,
  MichelsonMap,
} from "@taquito/taquito";
import {
  validateAddress,
  encodePubKey,
  encodeKey,
  encodeKeyHash,
} from "@taquito/utils";
import { assertNever } from "assert-never";
import { generateExecuteContractMichelson } from "../context/generateLambda";
import { version } from "../types/display";

type michelsonType =
  | "address"
  | "bool"
  | "bytes"
  | "int"
  | "key"
  | "key_hash"
  | "mutez"
  | "nat"
  | "string"
  | "timestamp"
  | "bls12_381_fr"
  | "bls12_381_g1"
  | "bls12_381_g2"
  | "chain_id"
  | "never"
  | "operation"
  | "chest"
  | "chest_key"
  | "signature"
  | "unit"
  | "tx_rollup_l2_address"
  | "or"
  | "pair"
  | "list"
  | "set"
  | "option"
  | "map"
  | "big_map"
  | "constant"
  | "contract"
  | "lambda"
  | "sapling_state"
  | "sapling_transaction"
  | "sapling_transaction_deprecated"
  | "ticket"
  | "ticket_deprecated";

type token = {
  counter: number;
  name?: string;
  type: michelsonType;
  children: token[];
  placeholder?: string;
  validate?: (value: string) => string | undefined;
  initValue: tokenValueType;
};

type tokenMap = Record<"key" | "value", token>;

type tokenValueType = string | boolean | number | token | token[] | tokenMap[];

function getFieldName(id: number): string {
  return `input-${id.toString()}`;
}

function showName(type: string, name?: string) {
  if (name && isNaN(Number(name))) {
    return `${name} : ${type}`;
  } else {
    return type;
  }
}

function initTokenTable(
  init: Record<string, tokenValueType>,
  counter: number,
  defaultInit: tokenValueType = ""
): void {
  init[getFieldName(counter)] = defaultInit;
}

function allocateNewTokenCounter(
  token: token,
  counter: number,
  setFieldValue: (
    field: string,
    value: any,
    shouldValidate?: boolean | undefined
  ) => void
): number {
  let new_counter = counter;
  token.children.forEach((v, i) => {
    new_counter = allocateNewTokenCounter(v, new_counter, setFieldValue);
    new_counter = new_counter + 1;
    v.counter = new_counter;
    setFieldValue(getFieldName(v.counter), v.initValue);
  });
  return new_counter;
}

function parseSchema(
  counter: number,
  token: TokenSchema,
  init: Record<string, tokenValueType>,
  name?: string
): [token, number] {
  switch (token.__michelsonType) {
    case "bls12_381_fr":
    case "bls12_381_g1":
    case "bls12_381_g2":
    case "chain_id":
    case "key_hash":
    case "key":
    case "bytes":
    case "signature":
    case "string":
      initTokenTable(init, counter);
      return [
        {
          counter,
          name,
          type: token.__michelsonType,
          children: [],
          placeholder: token.__michelsonType,
          initValue: "",
        },
        counter,
      ];
    case "address":
      initTokenTable(init, counter);
      return [
        {
          counter: counter,
          name,
          type: token.__michelsonType,
          children: [],
          placeholder: token.__michelsonType,
          validate(value: string): string | undefined {
            if (validateAddress(value) !== 3) {
              return `invalid address ${value}`;
            }
          },
          initValue: "",
        },
        counter,
      ];
    case "contract":
      initTokenTable(init, counter);
      return [
        {
          counter: counter,
          name,
          type: token.__michelsonType,
          children: [],
          placeholder: "contract",
          validate(value: string): string | undefined {
            if (validateAddress(value) !== 3) {
              return `invalid address ${value}`;
            }
          },
          initValue: "",
        },
        counter,
      ];
    case "bool":
      initTokenTable(init, counter, false);
      return [
        {
          counter: counter,
          name,
          type: token.__michelsonType,
          children: [],
          placeholder: token.__michelsonType,
          initValue: false,
        },
        counter,
      ];
    case "int":
    case "nat":
      initTokenTable(init, counter);
      return [
        {
          counter: counter,
          name,
          type: token.__michelsonType,
          children: [],
          placeholder: token.__michelsonType,
          validate(value: string): string | undefined {
            if (value && isNaN(Number(value))) {
              return `Invalid number, got: ${value}`;
            }
          },
          initValue: "",
        },
        counter,
      ];
    case "mutez":
    case "timestamp":
      initTokenTable(init, counter);
      return [
        {
          counter: counter,
          name,
          type: token.__michelsonType,
          children: [],
          placeholder: token.__michelsonType,
          validate(value: string): string | undefined {
            const n = Number(value);
            if (isNaN(n)) {
              return `Invalid number, got: ${value}`;
            }
            if (n < 0) {
              return `Number should be greater or equal to 0, got ${value}`;
            }
          },
          initValue: "",
        },
        counter,
      ];
    case "never":
      return [
        {
          counter: counter,
          name,
          type: token.__michelsonType,
          children: [],
          initValue: "",
        },
        counter,
      ];
    case "operation":
      throw new Error("can't happen: operation is forbidden in the parameter");
    case "chest":
    case "chest_key":
      throw new Error(
        "can't happen(Tezos bug): time lock related instructions is disabled in the client because of a vulnerability"
      );
    case "unit":
      return [
        {
          counter: counter,
          name,
          type: token.__michelsonType,
          children: [],
          initValue: "",
        },
        counter,
      ];
    case "tx_rollup_l2_address":
      throw new Error("can't happen: this type has been disable");
    case "or": {
      const schemas = Object.entries(token.schema);
      let new_counter = counter;
      const children: token[] = [];
      let child: token;
      schemas.forEach(([k, v]) => {
        [child, new_counter] = parseSchema(new_counter + 1, v, init, k);
        children.push(child);
      });
      initTokenTable(init, counter, schemas[0][0]);
      return [
        {
          counter: counter,
          name,
          type: token.__michelsonType,
          children,
          initValue: schemas[0][0],
        },
        new_counter,
      ];
    }
    case "set":
    case "list": {
      initTokenTable(init, counter, [] as token[]);
      const [child, new_counter] = parseSchema(counter + 1, token.schema, init);
      return [
        {
          counter: counter,
          name,
          type: token.__michelsonType,
          children: [child],
          initValue: [] as token[],
        },
        new_counter,
      ];
    }
    case "pair": {
      const schemas = Object.entries(token.schema);
      let new_counter = counter;
      const children: token[] = [];
      let child: token;
      schemas.forEach(([k, v]) => {
        [child, new_counter] = parseSchema(new_counter + 1, v, init, k);
        children.push(child);
      });
      initTokenTable(init, counter, []);
      return [
        {
          counter: counter,
          name,
          type: token.__michelsonType,
          children,
          initValue: [],
        },
        new_counter,
      ];
    }
    case "map":
    case "big_map": {
      const schemas = Object.entries(token.schema);
      let new_counter = counter;
      const children: token[] = [];
      let child: token;
      schemas.forEach(([k, v]) => {
        [child, new_counter] = parseSchema(new_counter + 1, v, init, k);
        children.push(child);
      });
      initTokenTable(init, counter, []);
      return [
        {
          counter: counter,
          name,
          type: token.__michelsonType,
          children,
          initValue: [],
        },
        new_counter,
      ];
    }
    case "option": {
      const [child, new_counter] = parseSchema(counter + 1, token.schema, init);

      initTokenTable(init, counter, "none");
      return [
        {
          counter: counter,
          name,
          type: token.__michelsonType,
          children: [child],
          initValue: "none",
        },
        new_counter,
      ];
    }
    case "constant":
      throw new Error("can't happen: constant will never be in parameter");
    case "lambda":
      initTokenTable(init, counter);
      return [
        {
          counter: counter,
          name,
          type: token.__michelsonType,
          placeholder: "lambda",
          children: [],
          initValue: "",
        },
        counter,
      ];
    case "sapling_transaction_deprecated":
    case "sapling_transaction":
    case "sapling_state":
      initTokenTable(init, counter);
      return [
        {
          counter: counter,
          name,
          type: token.__michelsonType,
          placeholder: token.__michelsonType + " " + token.schema.memoSize,
          children: [],
          initValue: "",
        },
        counter,
      ];
    case "ticket_deprecated":
    case "ticket":
      initTokenTable(init, counter);
      return [
        {
          counter: counter,
          name,
          type: token.__michelsonType,
          children: [],
          initValue: "",
        },
        counter,
      ];
    default:
      return assertNever(token);
  }
}

function evalTaquitoParam(
  token: token,
  tableValue: Record<string, tokenValueType>
): any {
  switch (token.type) {
    case "bls12_381_fr":
    case "bls12_381_g1":
    case "bls12_381_g2":
    case "chain_id":
    case "key_hash":
    case "key":
    case "bytes":
    case "address":
    case "signature":
    case "string":
    case "contract":
      return tableValue[getFieldName(token.counter)];
    case "bool":
      return tableValue[getFieldName(token.counter)];
    case "int":
    case "nat":
    case "mutez":
    case "timestamp": {
      const value = tableValue[getFieldName(token.counter)];
      if (!value) {
        throw new Error(
          `Incorrect or empty value, ${showName(token.type, token.name)}`
        );
      }
      return Number(value);
    }
    case "never":
      return undefined;
    case "operation":
      throw new Error("can't happen: operation is forbidden in the parameter");
    case "chest":
    case "chest_key":
      throw new Error(
        "can't happen(Tezos bug): time lock related instructions is disabled in the client because of a vulnerability"
      );
    case "unit":
      return [["unit"]];
    case "tx_rollup_l2_address":
      throw new Error("can't happen: this type has been disabled");
    case "or": {
      const key = tableValue[getFieldName(token.counter)];
      const child = key && token.children.find(x => x.name == key);
      if (!child) {
        throw new Error(`the selection ${key} doesn't exist`);
      }
      const value = evalTaquitoParam(child, tableValue);
      return Object.fromEntries([[key, value]]);
    }
    case "set":
    case "list": {
      const values = tableValue[getFieldName(token.counter)];
      if (!Array.isArray(values)) {
        throw new Error(
          `internal error: the expected type of list or set is incorrect.`
        );
      }
      return values
        .map(v => {
          if ("counter" in v) {
            return evalTaquitoParam(v, tableValue);
          } else {
            throw new Error(
              `internal error: the expected type of element of list or set is incorrect.`
            );
          }
        })
        .filter(v => v !== undefined);
    }
    case "pair": {
      const raw: token[] = token.children;
      const values = raw.map((v, idx) => {
        const check_key = isNaN(Number(v.name));
        return [check_key ? v.name : idx, evalTaquitoParam(v, tableValue)];
      });
      return Object.fromEntries(values) as object;
    }
    case "map":
    case "big_map": {
      const values = tableValue[getFieldName(token.counter)];
      if (!Array.isArray(values)) {
        throw new Error(
          `internal error: the expected type of map is incorrect.`
        );
      }
      const map = new MichelsonMap();
      values.map(v => {
        if ("counter" in v) {
          throw new Error(
            `internal error: the expected type of element of list or set is incorrect.`
          );
        } else {
          map.set(
            evalTaquitoParam(v.key, tableValue),
            evalTaquitoParam(v.value, tableValue)
          );
        }
      });
      return map;
    }
    case "option": {
      const values = tableValue[getFieldName(token.counter)];
      if (typeof values !== "string") {
        throw new Error(
          `internal error: the expected value of option is incorrect.`
        );
      }
      if (values === "some") {
        return evalTaquitoParam(token.children[0], tableValue);
      } else {
        return null;
      }
    }
    case "constant":
      throw new Error("can't happen: constant will never be in parameter");
    case "lambda": {
      const values = tableValue[getFieldName(token.counter)];
      if (typeof values !== "string") {
        throw new Error(
          `internal error: the expected value of lambda is incorrect.`
        );
      }
      const p = new Parser();
      return p.parseMichelineExpression(values);
    }
    case "sapling_transaction_deprecated":
    case "sapling_transaction":
    case "sapling_state":
      return tableValue[getFieldName(token.counter)];
    case "ticket_deprecated":
    case "ticket":
      return tableValue[getFieldName(token.counter)];
    default:
      return assertNever(token.type);
  }
}

function genLambda(
  version: version,
  props: {
    address: string;
    amount: number;
    shape: any;
    reset: () => void;
    setField: (lambda: string, metadata: string) => void;
    setLoading: (x: boolean) => void;
    setState: (shape: any) => void;
    loading: boolean;
  },
  values: any
) {
  let entrypoint = "default";
  let taquitoParam;
  const taquitoFullParam = evalTaquitoParam(props.shape.token, values);

  if (props.shape.contract.parameterSchema.isMultipleEntryPoint) {
    const p = Object.entries(taquitoFullParam);
    if (p.length !== 1) {
      throw new Error("should only one entrypoint is selected");
    }
    [entrypoint, taquitoParam] = p[0];
  } else {
    taquitoParam = taquitoFullParam;
  }
  const param = emitMicheline(
    props.shape.contract.methodsObject[entrypoint](
      taquitoParam
    ).toTransferParams().parameter.value
  );

  const micheline_type = props.shape.contract.parameterSchema
    .isMultipleEntryPoint
    ? props.shape.contract.entrypoints.entrypoints[entrypoint]
    : props.shape.contract.parameterSchema.root.val;
  const p = new Parser();
  const type = emitMicheline(p.parseJSON(micheline_type), {
    indent: "",
    newline: "",
  });

  const lambda = generateExecuteContractMichelson(version, {
    address: props.address,
    entrypoint,
    type,
    amount: props.amount,
    param,
  });

  props.setField(
    lambda,
    JSON.stringify(
      {
        contract_addr: props.address,
        mutez_amount: props.amount,
        entrypoint,
        payload: param,
      },
      null,
      2
    )
  );
  props.setLoading(false);
}

/**
 *
 * @param contract
 * @param initTokenTable
 * @returns token
 *
 * Token is parsed the parameter of Michelson in AST.
 * The returned token is the root of AST and named "entrypoint".
 * If the parameter of Michelson has multiple entrypoints, the children of the root represent different entrypoints.
 * Otherwise, the children of the root are the parameter of the "default" entrypoint.
 */
function parseContract(
  c: ContractAbstraction<ContractProvider>,
  initTokenTable: Record<string, tokenValueType>
) {
  let token: token;
  let counter = 0;
  // reverse the elements so the order of entrypoints will be in alphabet
  const entryponts = Object.entries(c.entrypoints.entrypoints).reverse();

  if (entryponts.length == 0) {
    // handle the case of only "default" entrypoint
    [token, counter] = parseSchema(
      0,
      c.parameterSchema.generateSchema(),
      initTokenTable,
      "entrypoint"
    );
  } else {
    // handle the case of multiple entrypoints
    const childrenToken: token[] = [];
    let childToken;
    let init;
    let setInit = false;
    for (let i = 0; i < entryponts.length; i++) {
      const [entrypoint, type] = entryponts[i];
      const schema = new Schema(type).generateSchema();
      /** If the michelson type is "or", it means it's a nested entrypoint.
       *  The entrypoint is repeated. Therefore, don't make it as a child.
       */
      if (schema.__michelsonType !== "or") {
        /**
         * Chose default value for selection component.
         * Pick up the first non-nested entrypoint.
         */
        if (!setInit) {
          init = entrypoint;
          setInit = true;
        }
        let new_counter;
        [childToken, new_counter] = parseSchema(
          counter,
          schema,
          initTokenTable,
          entrypoint
        );
        counter = new_counter + 1;
        childrenToken.push(childToken);
      }
    }
    counter = counter + 1;
    if (typeof init === "undefined")
      throw new Error("internal error: initial entrypoint is undefined");
    token = {
      counter,
      name: "entrypoint",
      type: "or",
      children: childrenToken,
      initValue: init,
    };
    initTokenTable[getFieldName(token.counter)] = token.initValue;
  }

  initTokenTable["counter"] = counter;
  return token;
}

/**
 *  pair (t{1}) ... (t{n}) with n > 2: A shorthand for pair (t{1}) (pair (t{2}) ... (pair (t{n-1}) (t{n})) ...).
 *
 *  reference: https://tezos.gitlab.io/active/michelson.html#core-data-types-and-notations
 */
function toRightAssociativePairType(type: Expr): void {
  if ("prim" in type && type.prim === "pair" && !!type.args) {
    if (type.args.length <= 2) {
      return;
    } else {
      const right = type.args.pop();
      const left = type.args.pop();
      if (!right || !left) throw new Error("Internal: it'can happen.");
      type.args.push({ prim: "pair", args: [left, right] });
      toRightAssociativePairType(type);
    }
  } else {
    throw new Error("Internal: not pair");
  }
}

function toRightAssociativePairData(data: Expr): Expr {
  if ("prim" in data && data.prim === "Pair" && !!data.args) {
    if (data.args.length <= 2) {
      return data;
    } else {
      const right = data.args.pop();
      const left = data.args.pop();
      if (!right || !left) throw new Error("Internal: it'can happen.");
      data.args.push({ prim: "Pair", args: [left, right] });
      return toRightAssociativePairData(data);
    }
  } else if (Array.isArray(data)) {
    if (data.length < 2) {
      return data;
    } else {
      const right = data.pop();
      const left = data.pop();
      if (!right || !left) throw new Error("Internal: it'can happen.");
      if (data.length == 0) {
        return { prim: "Pair", args: [left, right] };
      } else {
        data.push({ prim: "Pair", args: [left, right] });
        return toRightAssociativePairData(data);
      }
    }
  } else {
    throw new Error("Internal: not pair");
  }
}

function decodeB58(type: Expr, data: Expr): Expr {
  if ("prim" in type) {
    switch (type.prim as michelsonType) {
      case "bls12_381_fr":
      case "bls12_381_g1":
      case "bls12_381_g2":
      case "chain_id":
      case "bytes":
      case "string":
      case "bool":
      case "int":
      case "nat":
      case "mutez":
      case "timestamp":
      case "never":
      case "operation":
      case "chest":
      case "chest_key":
      case "unit":
      case "constant":
      case "sapling_transaction_deprecated":
      case "sapling_transaction":
      case "sapling_state":
      case "signature":
        return data;
      case "key_hash": {
        if ("bytes" in data) {
          let decode = encodeKeyHash(data.bytes);
          if (!!decode) return { string: decode };
          else
            throw new Error(
              "Internal: fail to decode address from bytes to string presentation"
            );
        } else {
          return data;
        }
      }
      case "tx_rollup_l2_address":
        throw new Error(
          "Internal: tx_rollup_l2_address is disable by protocol."
        );
      case "key": {
        if ("bytes" in data) {
          let decode = encodeKey(data.bytes);
          if (!!decode) return { string: decode };
          else
            throw new Error(
              "Internal: fail to decode address from bytes to string presentation"
            );
        } else {
          return data;
        }
      }
      case "contract":
      case "address": {
        if ("bytes" in data) {
          let decode = encodePubKey(data.bytes);
          if (!!decode) return { string: decode };
          else
            throw new Error(
              "Internal: fail to decode address from bytes to string presentation"
            );
        } else {
          return data;
        }
      }
      case "ticket_deprecated":
        throw new Error("Internal: ticket_deprecated can't be happen.");
      //TODO: handle lambda
      case "lambda":
        return data;
      case "ticket": {
        if ("prim" in data && !!data.args && Array.isArray(data.args)) {
          let [ticketer, value] = data.args;
          if ("bytes" in ticketer) {
            let decode_ticketer = encodePubKey(ticketer.bytes);
            if (!!decode_ticketer) ticketer = { string: decode_ticketer };
            else
              throw new Error(
                "Internal: fail to decode tickerer's address from bytes to string presentation"
              );
          }
          data.args[0] = ticketer;
          if (
            !!type.args?.[0] &&
            "prim" in type.args[0] &&
            type.args[0].prim === "address"
          ) {
            if (
              "prim" in value &&
              !!value.args?.[0] &&
              "bytes" in value.args[0]
            ) {
              let decode_value = encodePubKey(value.args[0].bytes);
              if (!!decode_value) value.args[0] = { string: decode_value };
              else
                throw new Error(
                  "Internal: fail to decode an address of contain from bytes to string presentation"
                );
            }
          }
          data.args[1] = value;
          return data;
        } else {
          throw new Error("Internal: the structure of ticket is wrong");
        }
      }
      case "or": {
        if ("prim" in data && data.args?.[0]) {
          if (data.prim == "Left" && !!type.args?.[0]) {
            const new_data = decodeB58(type.args[0], data.args?.[0]);
            return new_data;
          } else if (data.prim == "Right" && type.args?.[1]) {
            const new_data = decodeB58(type.args[1], data.args?.[0]);
            return new_data;
          } else {
            throw new Error("Internal: or should be either left or right");
          }
        } else {
          throw new Error("Internal: or should be data");
        }
      }
      case "map":
      case "big_map": {
        if (Array.isArray(data)) {
          data.map(v => {
            if ("prim" in v && !!v.args) {
              let t_data = type.args?.map((tv, i) => {
                if (!v.args?.[i]) throw new Error("Internal: should have args");
                const d = decodeB58(tv, v.args[i]);
                v.args[i] = d;
              });
            } else {
              throw new Error("Internal: data should be a prim");
            }
          });
          return data;
        } else {
          throw new Error("Internal: data should be map or big_map");
        }
      }
      case "pair": {
        toRightAssociativePairType(type);
        data = toRightAssociativePairData(data);
        if ("prim" in data && "args" in data) {
          let new_data = type.args?.map((v, i) => {
            if ("prim" in data && "args" in data) {
              if (!data.args?.[i])
                throw new Error("Internal: should have args");
              const d = decodeB58(v, data.args[i]);
              return d;
            } else {
              throw new Error("Internal: data should be a prim or array");
            }
          });
          data.args = new_data;

          return data;
        } else {
          throw new Error("Internal: data should be a prim or array");
        }
      }
      case "option": {
        if ("prim" in data) {
          if (data.prim === "Some" && !!data.args) {
            let new_data = type.args?.map((v, i) => {
              if ("prim" in data) {
                if (!data.args?.[i])
                  throw new Error("Internal: should have args");
                const d = decodeB58(v, data.args[i]);
                return d;
              } else {
                throw new Error("Internal: data should be a prim");
              }
            });
            data.args = new_data;
          }
          return data;
        } else {
          throw new Error("Internal: data should be a prim");
        }
      }
      case "set":
      case "list": {
        if (Array.isArray(data)) {
          let new_data = data.map(v => {
            if (!!type.args?.[0]) return decodeB58(type.args[0], v);
            else throw new Error("Internal: should have an arg");
          });
          return new_data;
        } else {
          throw new Error("Internal: should be array");
        }
      }
      default:
        throw new Error(`Internal: unknow type, ${type.prim}`);
    }
  } else {
    throw new Error("Internal: type should be a prim");
  }
}

export {
  parseSchema,
  genLambda,
  getFieldName,
  allocateNewTokenCounter,
  showName,
  parseContract,
  decodeB58,
  toRightAssociativePairType,
  toRightAssociativePairData,
};
export type { token, tokenMap, tokenValueType };
