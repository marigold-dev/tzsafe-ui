import {
  ErrorMessage,
  Field,
  FieldArray,
  Form,
  Formik,
  prepareDataForValidation,
  useFormikContext,
} from "formik";
import React, {
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { AppStateContext, contractStorage } from "../context/state";
import { VersionedApi } from "../versioned/apis";
import { Versioned } from "../versioned/interface";
import ContractLoader from "./contractLoader";
import TextInputWithCompletion from "./textInputWithComplete";
import { emitMicheline, Parser } from "@taquito/michel-codec";
import { TokenSchema } from "@taquito/michelson-encoder";
import { char2Bytes, validateContractAddress } from "@taquito/utils";
import FormContext from "../context/formContext";
import ReactDOM from "react-dom";
function capitalizeFirstLetter(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
type named = { name: string };
type withMap = { mapValue: (_: any) => any };
type withPlaceholder = { placeholder: string };
type form =
  | ({ type: "input" } & withMap & named & withPlaceholder)
  | ({ type: "select"; fields: form[] } & named)
  | ({ type: "constant"; value: any } & named)
  | ({ type: "record"; fields: form[] } & named)
  | ({ type: "array"; fields: form[] } & named)
  | ({ type: "field"; fields: form } & named & withMap)
  | ({ type: "textarea" } & named & withMap)
  | ({ type: "list"; fields: form } & named & withMap);

function makeForm(
  item: TokenSchema,
  parent: string = "entrypoint"
): form & { init: any } {
  let wrap = (item: form & { init: any }): form & { init: any } => {
    if (parent === "entrypoint") {
      return {
        type: "field",
        name: "entrypoint",
        fields: { ...item, name: "default" },
        init: item.init,
        mapValue(item: any): any {
          return { entrypoint: item };
        },
      };
    }
    return item;
  };
  if ("or" == item?.__michelsonType) {
    let form = Object.entries(item.schema).map(([field, schema]) => {
      let f = makeForm(schema, field);
      let formField = {
        ...f,
        mapValue: (value: any) => {
          return { [field]: "mapValue" in f ? f.mapValue(value) : value };
        },
      };
      return formField;
    });
    return {
      name: parent,
      type: "select",
      fields: form,
      init: { kind: form[0].name, init: form[0].init },
    };
  } else if (item?.__michelsonType == "unit") {
    return wrap({
      name: parent,
      type: "constant",
      value: {},
      init: {},
    });
  } else if (["tez", "mutez", "nat", "int"].includes(item?.__michelsonType)) {
    return wrap({
      name: parent,
      type: "input",
      placeholder: item.__michelsonType,
      init: 0,
      mapValue: (amount: string) => Number.parseInt(amount),
    });
  } else if ("pair" == item?.__michelsonType) {
    let keys = Object.keys(item.schema);
    let isArray = !Number.isNaN(Number(keys[0]));
    if (isArray) {
      let res = {
        type: "array",
        name: parent,
        fields: Object.entries(item.schema).map(([field, value]) => {
          let f = makeForm(value, field);
          return {
            type: "field",
            name: field,
            placeholder: value.__michelsonType,
            init: f.init,
            fields: f,
            mapValue: (x: any) => {
              return x;
            },
          };
        }),
      };
      return wrap({
        ...res,
        init: Object.fromEntries(res.fields.map((x) => [x.name, x.init])),
      } as form & { init: any });
    } else {
      let res = {
        type: "record",
        name: parent,
        fields: Object.entries(item.schema).map(([field, value]) => {
          let f = makeForm(value, field);
          return {
            type: "field",
            name: field,
            fields: f,
            init: f.init,
            mapValue: (x: any) => {
              return { [field]: x };
            },
          };
        }),
      };
      return wrap({
        ...res,
        init: Object.fromEntries(res.fields.map((x) => [x.name, x.init])),
      } as form & { init: any });
    }
  } else if (["list", "set"].includes(item?.__michelsonType)) {
    return wrap({
      type: "list",
      name: parent,
      init: [],
      fields: makeForm(item.schema as TokenSchema, parent),
      mapValue: (_: any) => _,
    });
  } else if (
    "map" == item?.__michelsonType ||
    "big_map" == item?.__michelsonType
  ) {
    return wrap({
      type: "list",
      name: parent,
      init: [],
      fields: {
        name: "map",
        type: "array",
        fields: [
          makeForm(item.schema.key, "key"),
          makeForm(item.schema.key, "value"),
        ],
      },
      mapValue: (x: any[]) => {
        return x.reduce((acc, x) => ({ ...acc, ...x }), {});
      },
    });
  } else if ("bool" === item?.__michelsonType) {
    return wrap({
      type: "select",
      name: parent,
      init: { kind: "true", init: true },
      fields: [
        { type: "constant", value: true, name: "true" },
        { type: "constant", value: false, name: "false" },
      ],
    });
  } else if ("bytes" === item?.__michelsonType) {
    return wrap({
      name: parent,
      placeholder: item.__michelsonType,
      type: "input",
      init: "",
      mapValue: (x: string) => char2Bytes(x),
    });
  } else if ("option" === item?.__michelsonType) {
    return wrap(makeForm(item.schema, parent));
  } else if ("lambda" == item?.__michelsonType) {
    return wrap({
      name: parent,
      type: "textarea",
      init: "",
      mapValue: (x: string) => {
        const p = new Parser();
        const michelsonCode = p.parseMichelineExpression(x);
        return michelsonCode;
      },
    });
  } else {
    let res = wrap({
      name: parent,
      placeholder: item?.__michelsonType,
      type: "input",
      init: "",
      mapValue: (x: any) => x,
    });
    return res;
  }
}
function makeName(parents: any[], name: string): string {
  return [...parents, name].join(".");
}
function getFieldName(path: any[], name: string, values: any): boolean {
  try {
    let fields = [...path].reduce((acc, x) => acc[x], values);
    if (typeof fields == "object") {
      return (
        !!Object.entries(fields).find(([k, v]) => k === name || v === name) ||
        false
      );
    } else {
      return fields === name;
    }
  } catch (e) {
    return false;
  }
}
function RenderItem({
  item,
  parent: parent,
}: React.PropsWithoutRef<{ item: form; parent: (string | number)[] }>) {
  const { values, setFieldValue, getFieldProps } = useFormikContext<any>();
  if ("select" == item?.type) {
    return (
      <div className="flex flex-col w-full border-2 border-white p-2">
        <label className="text-white">
          {capitalizeFirstLetter(
            !Number.isNaN(Number(item.name))
              ? `${item.type}: ${item.fields[0].type}`
              : item.name
          )}
        </label>
        <Field
          className="text-black"
          name={makeName(parent, item.name) + ".kind"}
          as="select"
        >
          {Object.entries(item.fields).map(([k, v]) => {
            return (
              <option className="text-black" key={k} value={v.name}>
                {v.name}
              </option>
            );
          })}
        </Field>
        <RenderItem
          parent={
            !isNaN(Number(item.name))
              ? getFieldProps(makeName(parent, item.name))
                  .name.split(".")
                  .concat([
                    getFieldProps(makeName(parent, item.name) + ".kind").value,
                  ])
                  .filter((x) => x !== undefined)
              : [...parent, item.name]
          }
          item={
            item.fields.find((x) => {
              return getFieldName(
                !parent.length
                  ? [item.name, "kind"]
                  : [...parent, item.name, "kind"],
                x.name,
                values
              );
            }) as any
          }
        />
      </div>
    );
  }
  if ("constant" == item?.type) {
    let fieldName =
      parent.length > 1 &&
      parent[parent.length - 1] === parent[parent.length - 2]
        ? parent.slice(0, -1).concat([item.name]).join(".")
        : parent[parent.length - 1] !== item.name
        ? makeName(parent, item.name)
        : parent.join(".");
    if (typeof getFieldProps(fieldName).value == "undefined") {
      setTimeout(() => {
        setFieldValue(fieldName, item.value);
      }, 250);
    }
    return (
      <p className="text-white">
        {item.name}: {JSON.stringify(item.value)}
      </p>
    );
  }
  if ("list" == item?.type) {
    let fieldName =
      parent.length && parent[parent.length - 1] === item.name
        ? parent.join(".")
        : makeName(parent, item.name);
    if (!getFieldProps(fieldName).value) {
      setTimeout(() => {
        setFieldValue(fieldName, []);
      }, 250);
    }
    let path: any[] = getFieldProps(fieldName).value;
    return (
      <FieldArray name={fieldName}>
        {({ push, pop }) => {
          return (
            <div className="w-full grid gap-2 grid-flow-row grid-cols-1">
              {isNaN(Number(item.name)) ? (
                <p className="text-white">{item.name}</p>
              ) : (
                <p className="text-white">
                  {item.type}: {item.fields.type}
                </p>
              )}
              {path &&
                path
                  .filter((x: any) =>
                    item.fields.type === "select" ? x.kind : true
                  )
                  .map((v, idx) => {
                    return (
                      <div
                        key={idx}
                        className="w-full grid gap-2 grid-flow-row grid-cols-1"
                      >
                        <RenderItem
                          parent={[...parent, item.name]}
                          item={{
                            ...item.fields,
                            name: idx.toString(),
                          }}
                        />
                      </div>
                    );
                  })}
              <div className="flex flex-col md:flex-row">
                {path && path.length > 0 && (
                  <button
                    type="button"
                    className={
                      " bg-primary hover:bg-red-500 focus:bg-red-500 font-medium text-white p-1.5 md:self-end self-center justify-self-end block md:mx-auto mx-none  hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
                    }
                    onClick={(e) => {
                      e.preventDefault();
                      pop();
                    }}
                  >
                    Remove
                  </button>
                )}
                <button
                  type="button"
                  className="bg-primary hover:bg-red-500 focus:bg-red-500 font-medium text-white p-1.5 md:self-end self-center justify-self-end block md:mx-auto mx-none  hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
                  onClick={(e) => {
                    e.preventDefault();
                    let field =
                      item.fields.type === "select"
                        ? { kind: item.fields.fields[0].name }
                        : item.fields.name;
                    push(field);
                  }}
                >
                  Add item
                </button>
              </div>
            </div>
          );
        }}
      </FieldArray>
    );
  }
  if ("input" == item?.type) {
    let fieldName =
      parent.length > 1 &&
      parent[parent.length - 1] === parent[parent.length - 2]
        ? parent.slice(0, -1).concat([item.name]).join(".")
        : parent[parent.length - 1] !== item.name
        ? makeName(parent, item.name)
        : parent.join(".");
    return (
      <div className="w-full grid gap-2 grid-flow-row grid-cols-1">
        <label className="text-white">
          {capitalizeFirstLetter(
            !Number.isNaN(Number(item.name)) ? item.placeholder : item.name
          )}
        </label>
        <Field
          as="input"
          className={
            "relative border-2 text-black p-2 text-sm md:text-md min-h-fit h-fit w-full"
          }
          placeholder={item.placeholder}
          rows={10}
          name={fieldName}
        />
      </div>
    );
  }
  if ("record" == item?.type) {
    return (
      <div className="grid grid-flow-row gap-4 items-start mb-2 w-full border-2 border-white">
        {item.fields.map((x) => (
          <RenderItem key={x.name} parent={[...parent, item.name]} item={x} />
        ))}
      </div>
    );
  }

  if ("array" == item?.type) {
    return (
      <div className="grid grid-flow-row gap-4 items-start mb-2 w-full border-2 border-white">
        {item.fields.map((x) => {
          return (
            <RenderItem key={x.name} parent={[...parent, item.name]} item={x} />
          );
        })}
      </div>
    );
  }
  if ("textarea" == item?.type) {
    let fieldName =
      parent.length > 1 &&
      parent[parent.length - 1] === parent[parent.length - 2]
        ? parent.slice(0, -1).concat([item.name]).join(".")
        : parent[parent.length - 1] !== item.name
        ? makeName(parent, item.name)
        : parent.join(".");
    return (
      <div
        className={
          "relative flex flex-col w-full md:grow justify-start  md:w-full "
        }
      >
        <label className="text-white">{item.name}</label>
        <Field
          className={
            "relative border-2 p-2 text-sm md:text-md min-h-fit h-fit w-full text-black"
          }
          placeholder={"Enter lambda here"}
          rows={10}
          name={fieldName}
          defaultValue={""}
          as="textarea"
        />
      </div>
    );
  }
  if ("field" == item?.type) {
    return (
      <RenderItem
        parent={
          item.name !== item.fields.name ? [...parent, item.name] : parent
        }
        item={item.fields}
      />
    );
  }
  let never: never = item;
  return null;
}

function Basic({
  setFormState,
}: React.PropsWithoutRef<{
  setFormState: (x: { address: string; amount: number }) => void;
}>) {
  const state = useContext(AppStateContext)!;
  const renderError = (message: string) => (
    <p className="italic text-red-600">{message}</p>
  );
  let initialState = {
    amount: 0,
    walletAddress: "",
  };

  return (
    <Formik
      initialValues={initialState}
      validate={async (values) => {
        let errors: any = {};
        if (validateContractAddress(values.walletAddress) !== 3) {
          errors.walletAddress = `Invalid address ${values.walletAddress}`;
        }
        let exists = await (async () => {
          try {
            await state.connection.contract.at(values.walletAddress);
            return true;
          } catch (e) {
            return false;
          }
        })();
        if (!exists) {
          errors.walletAddress = `Contract does not exist at address ${values.walletAddress}`;
        }
        if (isNaN(Number(values.amount))) {
          errors.amount = "Invalid amount " + values.amount;
        }

        return errors;
      }}
      onSubmit={async (values) => {
        setFormState({ address: values.walletAddress, amount: values.amount });
      }}
    >
      {({ setFieldValue }) => (
        <Form className="flex flex-col justify-center items-center align-self-center justify-self-center col-span-1 w-full">
          <div className="text-2xl font-medium self-center mb-2 text-white">
            Enter amount and contract address below
          </div>
          <div className="flex flex-col w-full justify-center md:flex-col ">
            <div className="flex flex-col w-full">
              <div className="flex flex-col items-start mb-2 w-full">
                <label className="font-medium text-white">
                  Amount in mutez:{" "}
                </label>
                <Field
                  name="amount"
                  className=" border-2 p-2 w-full text-black"
                  placeholder="0"
                  validate={(value: string) => {
                    let error;
                    if (isNaN(Number(value))) {
                      error = `Amount should be a number, got: ${value}`;
                    }
                    let num = Number(value);
                    if (num < 0) {
                      error = `Amount should be a positive number, got: ${value}`;
                    }
                    return error;
                  }}
                />
              </div>
              <ErrorMessage name="amount" render={renderError} />
            </div>
            <div className="flex flex-col w-full ">
              <div className="flex flex-col items-start mb-2 w-full">
                <label className="font-medium text-white">
                  Contract address
                </label>
                <TextInputWithCompletion
                  setTerms={({ payload, term: _ }) => {
                    setFieldValue("walletAddress", payload);
                  }}
                  filter={(x) => validateContractAddress(x as string) === 3}
                  byAddrToo={true}
                  as="input"
                  name={`walletAddress`}
                  className=" border-2 p-2 w-full text-black"
                  placeholder={"contract address"}
                  rows={10}
                />
              </div>
              <ErrorMessage name="walletAddress" render={renderError} />
            </div>
          </div>
          <button
            className="bg-primary font-medium text-white my-2 p-2  hover:outline-none "
            type="submit"
          >
            Continue
          </button>
        </Form>
      )}
    </Formik>
  );
}

function ExecuteForm(
  props: React.PropsWithoutRef<{
    address: string;
    amount: number;
    shape: any;
    reset: () => void;
    setField: (lambda: string, metadata: string) => void;
    setLoading: (x: boolean) => void;
    setState: (shape: any) => void;
    loading: boolean;
  }>
) {
  let state = useContext(AppStateContext)!;
  let address = props.address;
  let conn = state.connection;
  let setLoading = props.setLoading;
  let loading = props.loading;
  useEffect(() => {
    if (!Object.keys(props.shape).length && !loading) {
      (async () => {
        try {
          setLoading(true);
          let c = await conn.contract.at(address);
          // this is needed
          let res = makeForm(c.parameterSchema.generateSchema());
          let initial = {
            entrypoint:
              res.name !== "entrypoint"
                ? {
                    ...Object.fromEntries(
                      (res as any).fields.map((x: any) => [x.name, x.init])
                    ),
                    ...res.init,
                  }
                : { default: (res as any).fields.init },
          };
          props.setState({
            entrypoint: initial,
            form: res,
            schema: c,
          });
          setLoading(false);
        } catch (e) {
          console.log(e);
          setLoading(false);
        }
      })();
    }
  }, [address, loading, props.shape]);
  return (
    <div className="text-white w-full">
      <Formik
        enableReinitialize
        initialValues={props.shape?.entrypoint}
        onSubmit={async (values) => {
          props.setLoading(true);
          try {
            function merge(x: form, v: any): any {
              if (x.type === "select") {
                let field = x.fields.find((x) => x.name == v.kind);
                if (
                  field?.type == "constant" &&
                  field?.name != v[v.kind].toString()
                ) {
                  return { [field.name]: v[v.kind] };
                }
                return "mapValue" in field! && !(v.kind in v)
                  ? field.mapValue(merge(field!, v[v.kind]))
                  : merge(field!, v[v.kind]);
              }
              if (x.type === "constant") {
                return typeof v === "object" && x.name in v ? v[x.name] : v;
              }
              if (x.type === "array") {
                if (x.name === "map") {
                  return {
                    [merge(x.fields.find((y) => y.name === "key")!, v.key)]:
                      merge(x.fields.find((y) => y.name === "value")!, v.value),
                  };
                }
                let res = Object.fromEntries(
                  Object.entries(v)
                    .filter(([k, v]) => x.fields.some((x) => x.name == k))
                    .map(([k, v]: any) => {
                      let f = x.fields.find((y) => y.name === k)!;
                      let unwrap =
                        f.type === "field" && f.fields.type !== "select";

                      return [
                        k,
                        merge(
                          f,
                          typeof v === "object" && unwrap && f.name in v
                            ? v[f.name]
                            : v
                        ),
                      ];
                    })
                );
                if ("mapValue" in x) {
                  return (x as any).mapValue(res);
                }
                return res;
              }
              if (x.type === "record") {
                let res = Object.fromEntries(
                  Object.entries(v)
                    .filter(([k, v]) => x.fields.some((x) => x.name == k))
                    .map(([k, v]: any) => {
                      let f = x.fields.find((y) => y.name === k)!;
                      let unwrap =
                        f.type === "field" && f.fields.type !== "select";

                      return [
                        k,
                        merge(
                          f,
                          typeof v === "object" && unwrap && f.name in v
                            ? v[f.name]
                            : v
                        ),
                      ];
                    })
                );
                if ("mapValue" in x) {
                  return (x as any).mapValue(res);
                }
                return res;
              }
              if (x.type === "list") {
                let li = !!v ? v.map((y: any) => merge(x.fields, y)) : [];
                return x.mapValue(li);
              }
              if (x.type === "field") {
                let res = merge(
                  x.fields,
                  typeof v == "object"
                    ? x.fields.name in v || x.name in v
                      ? v[x.fields.name] || v
                      : v[x.name] || v
                    : v
                );
                return x.fields.name === x.name ? res : x.mapValue(res);
              }
              if (x.type === "input" || x.type == "textarea") {
                return x.mapValue(v);
              }
            }
            let res = merge(props.shape.form, values.entrypoint);
            res = "entrypoint" in res ? res.entrypoint : res;
            let p = new Parser();
            let param = emitMicheline(
              p.parseJSON(props.shape.schema.parameterSchema.EncodeObject(res))
            );
            let typ = emitMicheline(
              props.shape.schema.script.code[0].args[0] as any,
              {
                indent: "",
                newline: "",
              }
            );
            let lambda = `
          { 
            DROP ;                                        
            PUSH address "${props.address}";
            CONTRACT ${typ};
            IF_NONE { PUSH string "failure" ; FAILWITH } {} ;                            
            PUSH mutez ${props.amount} ;                                
            PUSH ${typ} ${param} ;
            TRANSFER_TOKENS 
          }`;
            props.setField(
              lambda,
              JSON.stringify(
                {
                  contract_addr: props.address,
                  mutez_amount: props.amount,
                  payload: res,
                },
                null,
                2
              )
            );
            props.setLoading(false);
          } catch (e) {
            console.log(e);
            props.setLoading(false);
          }
        }}
      >
        {({ resetForm }) => (
          <Form className="w-full flex grow flex-col justify-center items-center align-self-center justify-self-center col-span-2 border-2 border-white">
            <div className="text-2xl font-medium self-center mb-2 text-white">
              Add items below
            </div>
            <div className="grid grid-flow-row gap-4 p-2 items-start mb-2 w-full h-fit-content md:min-h-96 overflow-y-auto">
              {!!props.shape && (
                <RenderItem item={props.shape.form} parent={[]} />
              )}
            </div>
            <div className="flex flex-row md:w-1/3 justify-around">
              <button
                className=" bg-primary hover:bg-red-500 focus:bg-red-500 font-medium text-white my-2 p-2  hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
                onClick={(e) => {
                  e.preventDefault();
                  props.reset();
                }}
              >
                Reset
              </button>
              {
                <button
                  className=" bg-primary hover:bg-red-500 focus:bg-red-500 font-medium text-white my-2 p-2  hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
                  type="submit"
                >
                  Confirm
                </button>
              }
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
}
function ExecuteContractForm(
  props: React.PropsWithoutRef<{
    setField: (lambda: string, metadata: string) => void;
    getFieldProps: () => string;
  }>
) {
  let [state, setState] = useState({ address: "", amount: 0, shape: {} });
  let [loading, setLoading] = useState(false);
  let [done, setDone] = useState(false);
  let setLoader = useCallback((x: boolean) => {
    setLoading((prev: boolean) => {
      if (prev == x) {
        return prev;
      }
      return x;
    });
  }, []);
  let setStater = useCallback(({ shape }: { shape: object }) => {
    setState((prev: any) => {
      if (Object.keys(prev.shape).length) {
        return prev;
      }
      return { ...prev, shape };
    });
  }, []);
  if (loading) {
    return (
      <div className=" w-full border-2 mb-2 border-white p-2 flex align-middle items-center justify-center">
        <ContractLoader loading={loading}></ContractLoader>
      </div>
    );
  }
  if (done) {
    return (
      <div className=" w-full text-white border-2 mb-2 border-white p-2">
        <p className="text-white text-lg">Execute contract</p>
        <p>Metadata: {props.getFieldProps()}</p>
      </div>
    );
  }
  if (!state.address) {
    return (
      <div className=" w-full text-white">
        <p className="text-white text-lg">Execute contract:</p>
        <Basic setFormState={(x) => setState({ ...x, shape: {} })} />
      </div>
    );
  } else {
    return (
      <div className=" w-full text-white">
        <p className="text-white text-lg">Execute contract:</p>
        <ExecuteForm
          loading={loading}
          setLoading={setLoader}
          shape={state.shape}
          setState={(shape) => {
            setStater({ shape: shape });
          }}
          reset={() => setState({ address: "", amount: 0, shape: {} })}
          address={state.address}
          amount={state.amount}
          setField={(lambda: string, metadata: string) => {
            props.setField(lambda, metadata);
            setDone(true);
          }}
        />
      </div>
    );
  }
}
function TransferForm(
  props: React.PropsWithoutRef<{
    address: string;
    closeModal: () => void;
    contract: contractStorage;
  }>
) {
  const state = useContext(AppStateContext)!;
  let [loading, setLoading] = useState(false);
  let [result, setResult] = useState<boolean | undefined>(undefined);
  if (state?.address == null) {
    return null;
  }
  if (loading && typeof result == "undefined") {
    return <ContractLoader loading={loading}></ContractLoader>;
  }
  if (!loading && typeof result != "undefined") {
    return (
      <div className="flex justify-between items-center w-full md:h-12">
        <ContractLoader loading={loading}>
          <div className="text-sm md:text-xl my-auto text-white font-bold">
            {result ? (
              <div className="text-sm md:text-xl my-auto text-white font-bold flex flex-row">
                <span>Created proposal successfully</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="w-6 h-6 ml-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
              </div>
            ) : (
              <span className="text-sm md:text-xl my-auto text-white font-bold">
                Failed to create proposal
              </span>
            )}
          </div>
          <button
            onClick={() => {
              props.closeModal();
            }}
            type="button"
            className=" absolute right-4 top-4 ml-4 rounded-full bg-primary p-1 md:px-2 text-white hover:text-slate-400 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="fill-white w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </ContractLoader>
      </div>
    );
  }
  const renderError = (message: string) => {
    return <p className="italic text-red-600">{message}</p>;
  };
  const initialProps: {
    transfers: {
      type: "lambda" | "transfer" | "contract";
      values: { [key: string]: string };
      fields: {
        field: string;
        label: string;
        kind?: "textarea" | "input-complete";
        path: string;
        placeholder: string;
        validate: (p: string) => string | undefined;
      }[];
    }[];
  } = {
    transfers: [],
  };

  return (
    <Formik
      initialValues={initialProps}
      validate={(values) => {
        const errors: {
          transfers: { values: { [key: string]: string } }[];
        } = {
          transfers: [],
        };
        values.transfers.forEach((element, idx) => {
          Object.entries(element.values).forEach(([labl, value]) => {
            let field = element.fields.find((x) => x.field === labl);
            let validate =
              field?.placeholder !== value ? field?.validate(value) : undefined;
            if (validate) {
              if (!errors.transfers[idx]) {
                errors.transfers[idx] = { values: {} };
              }
              errors.transfers[idx].values[labl] = validate;
            }
          });
        });
        return errors.transfers.length === 0 ? undefined : errors;
      }}
      onSubmit={async (values) => {
        setLoading(true);
        try {
          let cc = await state.connection.contract.at(props.address);

          let versioned = VersionedApi(props.contract.version, props.address);
          await versioned.submitTxProposals(cc, state.connection, values);
          setResult(true);
        } catch (e) {
          console.log(e);
          setResult(false);
        }
        setLoading(false);
        setTimeout(() => {
          props.closeModal();
        }, 1500);
      }}
    >
      {({ values, errors, setFieldValue, getFieldProps }) => (
        <Form className="w-full flex grow flex-col justify-center items-center align-self-center justify-self-center col-span-2">
          <div className="text-2xl font-medium self-center mb-2 text-white">
            Add transactions below
          </div>
          <div className="grid grid-flow-row gap-4 items-start mb-2 w-full">
            <FieldArray name="transfers">
              {({ remove, push, replace }) => (
                <div className="min-w-full flex flex-col h-fit " id="top">
                  <div className="flex flex-col md:flex-row">
                    <button
                      type="button"
                      className=" bg-primary hover:bg-red-500 focus:bg-red-500  font-medium text-white my-2 p-2 self-center justify-self-center block mx-auto  hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
                      onClick={(e) => {
                        e.preventDefault();
                        push({
                          type: "transfer",
                          ...Versioned.transferForm(props.contract),
                        });
                      }}
                    >
                      Add transfer
                    </button>
                    <button
                      type="button"
                      className=" bg-primary hover:bg-red-500 focus:bg-red-500  font-medium text-white my-2 p-2 self-center justify-self-center block mx-auto  hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
                      onClick={(e) => {
                        e.preventDefault();
                        push({
                          type: "lambda",
                          ...Versioned.lambdaForm(props.contract),
                        });
                      }}
                    >
                      Add execute lambda
                    </button>
                    <button
                      type="button"
                      className=" bg-primary hover:bg-red-500 focus:bg-red-500  font-medium text-white my-2 p-2 self-center justify-self-center block mx-auto  hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
                      onClick={(e) => {
                        e.preventDefault();
                        push({
                          type: "contract",
                          ...Versioned.lambdaForm(props.contract),
                        });
                      }}
                    >
                      Add execute contract
                    </button>
                  </div>
                  {values.transfers.length > 0 &&
                    values.transfers.map((transfer, index) => {
                      if (transfer.type === "contract") {
                        return ReactDOM.createPortal(
                          <div>
                            <ExecuteContractForm
                              key={index}
                              getFieldProps={() =>
                                getFieldProps(
                                  `transfers.${index}.values.metadata`
                                ).value
                              }
                              setField={(lambda: string, metadata: string) => {
                                setFieldValue(
                                  `transfers.${index}.values.lambda`,
                                  lambda
                                );
                                setFieldValue(
                                  `transfers.${index}.values.metadata`,
                                  metadata
                                );
                              }}
                            />
                            <button
                              type="button"
                              className={
                                (errors.transfers && errors.transfers[index]
                                  ? "my-auto"
                                  : "") +
                                " bg-primary hover:bg-red-500 focus:bg-red-500 font-medium text-white p-1.5 md:self-end self-center justify-self-end block md:mx-auto mx-none  hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
                              }
                              onClick={(e) => {
                                e.preventDefault();
                                remove(index);
                              }}
                            >
                              Remove
                            </button>
                          </div>,
                          document.getElementById("top")!
                        );
                      }
                      const withTextArea = transfer.fields.find(
                        (x) => x?.kind === "textarea"
                      )
                        ? " flex-col md:flex-col"
                        : "";
                      return (
                        <div
                          className={
                            withTextArea +
                            " border-4 border-dashed border-white md:rounded-none md:border-none md:p-none p-2 flex md:flex-row flex-col  justify-around items-start min-w-full  min-h-fit h-fit"
                          }
                          key={index}
                        >
                          {transfer.fields.map((value, idx, arr) => {
                            const withTextArea = transfer.fields.find(
                              (x) => x?.kind === "textarea"
                            )
                              ? " w-full md:w-full "
                              : "";
                            let width =
                              arr.length === 1 &&
                              !transfer.fields.find(
                                (x) => x?.kind === "textarea"
                              )
                                ? " w-3/4 "
                                : "";
                            let classn =
                              (idx + 1) % 2 === 0
                                ? "relative flex flex-col w-full md:grow justify-start"
                                : "flex flex-col";
                            return (
                              <div
                                className={classn + width + withTextArea}
                                key={idx}
                              >
                                <label className="text-white">
                                  {value.label}
                                </label>
                                {!!value.kind &&
                                value.kind === "input-complete" ? (
                                  <TextInputWithCompletion
                                    setTerms={({ payload, term: _ }) => {
                                      replace(index, {
                                        ...values.transfers[index],
                                        values: {
                                          ...values.transfers[index].values,
                                          to: payload,
                                        },
                                      });
                                    }}
                                    filter={(_) => true}
                                    byAddrToo={true}
                                    as="input"
                                    name={`transfers.${index}.values.${value.field}`}
                                    className={
                                      "relative border-2 p-2 text-sm md:text-md min-h-fit h-fit w-full" +
                                      withTextArea
                                    }
                                    placeholder={value.placeholder}
                                    rows={10}
                                  />
                                ) : (
                                  <Field
                                    component={value.kind}
                                    name={`transfers.${index}.values.${value.field}`}
                                    className={
                                      "relative border-2 p-2 text-sm md:text-md min-h-fit h-fit" +
                                      withTextArea
                                    }
                                    placeholder={value.placeholder}
                                    rows={10}
                                  />
                                )}
                                <ErrorMessage
                                  name={`transfers.${index}.values.${value.field}`}
                                  render={renderError}
                                />
                              </div>
                            );
                          })}
                          <button
                            type="button"
                            className={
                              (errors.transfers && errors.transfers[index]
                                ? "my-auto"
                                : "") +
                              " bg-primary hover:bg-red-500 focus:bg-red-500 font-medium text-white p-1.5 md:self-end self-center justify-self-end block md:mx-auto mx-none  hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
                            }
                            onClick={(e) => {
                              e.preventDefault();
                              remove(index);
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
            </FieldArray>
          </div>
          <div className="flex flex-row md:w-1/3 justify-around">
            <button
              className=" bg-primary hover:bg-red-500 focus:bg-red-500 font-medium text-white my-2 p-2  hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
              onClick={(e) => {
                e.preventDefault();
                props.closeModal();
              }}
            >
              Cancel
            </button>
            {values.transfers.length > 0 && (
              <button
                className=" bg-primary hover:bg-red-500 focus:bg-red-500 font-medium text-white my-2 p-2  hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
                type="submit"
              >
                Submit
              </button>
            )}
          </div>
        </Form>
      )}
    </Formik>
  );
}

export default TransferForm;
