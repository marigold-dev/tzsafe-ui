import { NetworkType } from "@airgap/beacon-sdk";
import { emitMicheline, Parser } from "@taquito/michel-codec";
import { TokenSchema, ParameterSchema } from "@taquito/michelson-encoder";
import { MichelsonMap } from "@taquito/taquito";
import { char2Bytes, validateContractAddress } from "@taquito/utils";
import {
  ErrorMessage,
  Field,
  FieldArray,
  Form,
  Formik,
  useFormikContext,
} from "formik";
import { useRouter } from "next/router";
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import ReactDOM from "react-dom";
import { transferableAbortController } from "util";
import { MODAL_TIMEOUT, PREFERED_NETWORK } from "../context/config";
import { AppStateContext, contractStorage } from "../context/state";
import { VersionedApi } from "../versioned/apis";
import { Versioned } from "../versioned/interface";
import Alias from "./Alias";
import ContractLoader from "./contractLoader";
import renderError from "./formUtils";
import TextInputWithCompletion from "./textInputWithComplete";

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
      let fields = Object.entries(item.schema).map(([field, value]) => {
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
      });
      let res = {
        type: "array",
        name: parent,
        fields,
      };
      return wrap({
        ...res,
        meta: "pair",
        init: Object.fromEntries(res.fields.map(x => [x.name, x.init])),
      } as form & { init: any });
    } else {
      let res = {
        type: "record",
        name: parent,
        meta: "pair",
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
        meta: "pair",
        init: Object.fromEntries(res.fields.map(x => [x.name, x.init])),
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
    let key = makeForm(item.schema.key, "key");
    let value = makeForm(item.schema.value, "value");
    return wrap({
      type: "list",
      name: parent,
      init: { map: [] },
      fields: {
        name: "map",
        type: "array",
        init: { [key.name]: key.init, [value.name]: value.init },
        fields: [
          makeForm(item.schema.key, "key"),
          makeForm(item.schema.value, "value"),
        ],
      },
      mapValue: (x: any[]) => {
        return x.reduce((acc, x) => ({ ...acc, ...x }), {});
      },
    } as any);
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
      <div className="flex w-full flex-col rounded border-2 p-4">
        <label className="text-white">
          {capitalizeFirstLetter(
            !Number.isNaN(Number(item.name))
              ? `${item.type}: ${item.fields[0].type}`
              : item.name
          )}
        </label>
        <Field
          className="rounded p-2 text-left text-black"
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
                  .filter(x => x !== undefined)
              : [...parent, item.name]
          }
          item={
            item.fields.find(x => {
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
    return <p className="text-white">{JSON.stringify(item.value)}</p>;
  }
  if ("list" == item?.type) {
    let fieldName =
      parent.length && parent[parent.length - 1] === item.name
        ? parent.join(".")
        : makeName(parent, item.name);
    fieldName = item.fields.name === "map" ? fieldName + ".map" : fieldName;
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
            <div className="mt-1 grid w-full grid-flow-row grid-cols-1 gap-2">
              {isNaN(Number(item.name)) ? (
                <p className="text-white">
                  {Number.isNaN(Number(item.name))
                    ? capitalizeFirstLetter(item.name) + ": "
                    : ""}
                  {item.fields.name === "map" ? "map" : item.type}
                </p>
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
                        className="mt-1 grid w-full grid-flow-row grid-cols-1 gap-2"
                      >
                        <RenderItem
                          parent={
                            item.fields.name === "map"
                              ? [...parent, item.name, "map"]
                              : [...parent, item.name]
                          }
                          item={
                            {
                              ...item.fields,
                              name: idx.toString(),
                              meta: item.fields.name === "map" ? "map" : "",
                            } as any
                          }
                        />
                      </div>
                    );
                  })}
              <div className="mt-2 flex flex-col space-y-4 md:flex-row md:space-y-0">
                {path && path.length > 0 && (
                  <button
                    type="button"
                    className={
                      "mx-none block self-center justify-self-end rounded bg-primary p-1.5 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500 md:mx-auto md:self-end"
                    }
                    onClick={e => {
                      e.preventDefault();
                      pop();
                    }}
                  >
                    Remove
                  </button>
                )}
                <button
                  type="button"
                  className="mx-none block self-center justify-self-end rounded bg-primary p-1.5 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500 md:mx-auto md:self-end"
                  onClick={e => {
                    e.preventDefault();
                    let field =
                      item.fields.type === "select"
                        ? { kind: item.fields.fields[0].name }
                        : (item.fields as any).init;
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
        : Array.isArray(getFieldProps(parent.join(".")).value) ||
          (getFieldProps(parent.join(".")).value &&
            Object.entries(getFieldProps(parent.join(".")).value).every(
              ([k, _]) => !isNaN(Number(k))
            )) ||
          parent[parent.length - 1] !== item.name
        ? makeName(parent, item.name)
        : parent.join(".");
    return (
      <div className="mt-1 grid w-full grid-flow-row grid-cols-1 gap-2">
        <label className="text-white">
          {capitalizeFirstLetter(
            !Number.isNaN(Number(item.name)) ? item.placeholder : item.name
          )}
        </label>
        <Field
          as="input"
          className="md:text-md relative h-fit min-h-fit w-full rounded p-2 text-black"
          placeholder={item.placeholder}
          rows={10}
          name={fieldName}
          validate={(value: string) => {
            let error;
            if (item.placeholder === "int" && isNaN(Number(value))) {
              error = `Should be a number, got: ${value}`;
            }
            return error;
          }}
        />
        <ErrorMessage name={fieldName} render={renderError} />
      </div>
    );
  }
  if ("record" == item?.type) {
    return (
      <div className="mb-2 mt-2 grid w-full grid-flow-row items-start gap-4 rounded border-2 border-white p-4">
        {item.fields.map(x => (
          <RenderItem key={x.name} parent={[...parent, item.name]} item={x} />
        ))}
      </div>
    );
  }

  if ("array" == item?.type) {
    return (
      <div className="mb-2 mt-2 grid w-full grid-flow-row items-start gap-4 rounded border-2 border-white p-4">
        {item.fields.map(x => {
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
      <div className="relative flex w-full flex-col justify-start md:w-full md:grow">
        <label className="text-white">{item.name}</label>
        <Field
          className="md:text-md relative h-fit min-h-fit w-full p-2 text-black"
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

  let initialState = {
    amount: 0,
    walletAddress: "",
  };

  return (
    <Formik
      initialValues={initialState}
      validate={async values => {
        let errors: any = {};
        if (validateContractAddress(values.walletAddress.trim()) !== 3) {
          errors.walletAddress = `Invalid address ${values.walletAddress}`;
        }
        let exists = await (async () => {
          try {
            await state.connection.contract.at(values.walletAddress.trim());
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
      onSubmit={async values => {
        setFormState({
          address: values.walletAddress.trim(),
          amount: values.amount,
        });
      }}
    >
      {({ setFieldValue }) => (
        <Form className="align-self-center col-span-1 flex w-full flex-col items-center justify-center justify-self-center">
          <div className="flex w-full flex-col justify-center md:flex-col ">
            <div className="flex w-full flex-col">
              <div className="mb-2 flex w-full flex-col items-start">
                <label className="font-medium text-white">
                  Amount in mutez
                </label>
                <Field
                  name="amount"
                  className=" w-full rounded p-2 text-black"
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
            <div className="flex w-full flex-col ">
              <div className="mb-2 flex w-full flex-col items-start">
                <label className="font-medium text-white">
                  Contract address
                </label>
                <TextInputWithCompletion
                  setTerms={({ payload, term: _ }) => {
                    setFieldValue("walletAddress", payload);
                  }}
                  filter={x =>
                    validateContractAddress((x as string).trim()) === 3
                  }
                  byAddrToo={true}
                  as="input"
                  name={`walletAddress`}
                  className=" w-full p-2 text-black"
                  placeholder={"contract address"}
                  rows={10}
                />
              </div>
              <ErrorMessage name="walletAddress" render={renderError} />
            </div>
          </div>
          <button
            className="my-2 rounded bg-primary p-2 font-medium text-white  hover:outline-none "
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
  const state = useContext(AppStateContext)!;
  const [submitError, setSubmitError] = useState<undefined | string>(undefined);

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
  let init =
    props.shape?.form && typeof props.shape.form.init == "object"
      ? props.shape.form.type === "select"
        ? Object.fromEntries(
            props.shape.form.fields.map((x: any) => [x.name, x.init])
          )
        : {
            [typeof props.shape.form.init === "object" &&
            "kind" in props.shape.form.init
              ? props.shape.form.init.kind
              : "default"]:
              typeof props.shape.form.init === "object" &&
              "init" in props.shape.form.init
                ? props.shape.form.init.init
                : props.shape.form.init,
          }
      : ({
          entrypoint: {
            default: props.shape.form?.init || "",
            kind: "default",
          },
        } as any);

  return (
    <div className="w-full text-white">
      <Formik
        enableReinitialize
        initialValues={
          props.shape?.form && typeof props.shape.form.init == "object"
            ? {
                entrypoint: {
                  ...init,
                  kind:
                    typeof props.shape.form.init === "object" &&
                    "kind" in props.shape.form.init
                      ? props.shape.form.init.kind
                      : "default",
                },
              }
            : ({
                entrypoint: {
                  default: props.shape.form?.init || "",
                  kind: "default",
                },
              } as any)
        }
        validate={values => {
          let errors;
          if (
            values.entrypoint?.kind &&
            values.entrypoint?.kind in values.entrypoint &&
            typeof values.entrypoint[values.entrypoint?.kind] == "undefined"
          ) {
            return { entrypoint: { kind: "Please enter a value" } };
          }
          if (
            values.entrypoint?.kind &&
            !(values.entrypoint?.kind in values.entrypoint)
          ) {
            return { entrypoint: { kind: "Please enter a value" } };
          }
          return errors;
        }}
        onSubmit={async values => {
          props.setLoading(true);
          let isMap: boolean = false;
          try {
            function merge(x: form, v: any): any {
              if (x.type === "select") {
                let field = x.fields.find(x => x.name == v.kind);
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
                  isMap = true;
                  return {
                    [merge(x.fields.find(y => y.name === "key")!, v.key)]:
                      merge(x.fields.find(y => y.name === "value")!, v.value),
                  };
                }
                let res = Object.fromEntries(
                  Object.entries(v)
                    .filter(([k, v]) => x.fields.some(x => x.name == k))
                    .map(([k, v]: any) => {
                      let f = x.fields.find(y => y.name === k)!;
                      let unwrap =
                        f.type === "field" && f.fields.type !== "select";

                      return [
                        k,
                        merge(
                          f,
                          typeof v === "object" &&
                            unwrap &&
                            !Array.isArray(v) &&
                            f.name in v
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
                    .filter(([k, v]) => x.fields.some(x => x.name == k))
                    .map(([k, v]: any) => {
                      let f = x.fields.find(y => y.name === k)!;
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

              if (x.type === "list" && Array.isArray(v)) {
                let li = !!v ? v.map((y: any) => merge(x.fields, y)) : [];
                return x.mapValue(
                  li.map((x: any) =>
                    typeof x === "object" && "entrypoint" in x
                      ? x.entrypoint
                      : x
                  )
                );
              }
              if (x.type === "list" && !Array.isArray(v)) {
                v =
                  typeof v === "object" && "map" in v
                    ? v.map
                        .map((y: any) => merge(x.fields, y))
                        .map((x: any) =>
                          typeof x === "object" && "entrypoint" in x
                            ? x.entrypoint
                            : x
                        )
                    : v;
                return x.mapValue(v);
              }
              if (x.type === "field") {
                if (typeof x.fields == "object" && x.fields.type === "list") {
                  v =
                    typeof v == "object" && !Array.isArray(v)
                      ? x.fields.name in v || x.name in v
                        ? v[x.fields.name] || v
                        : v[x.name] || v
                      : v;
                  v =
                    typeof v === "object" && !Array.isArray(v) && "map" in v
                      ? v.map
                      : v;
                  let res = x.fields.mapValue(
                    Array.isArray(v)
                      ? v.map((y: any) => merge((x.fields as any).fields, y))
                      : v
                  );

                  return res;
                }
                let res = merge(
                  x.fields,
                  typeof v == "object"
                    ? (x.fields.name in v || x.name in v) && !Array.isArray(v)
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
            res =
              typeof res === "object" && "entrypoint" in res
                ? res.entrypoint
                : res;

            const unwrap = (x: object | any): any => {
              if (
                typeof x === "object" &&
                values.entrypoint!.kind in x &&
                typeof x[values.entrypoint!.kind] === "object" &&
                values.entrypoint!.kind in x[values.entrypoint!.kind]
              ) {
                return unwrap(x[values.entrypoint!.kind]);
              }
              return x;
            };
            res = unwrap(res);

            res =
              typeof res === "object" &&
              values.entrypoint.kind in res &&
              typeof res[values.entrypoint.kind] === "object" &&
              !Array.isArray(res[values.entrypoint.kind]) &&
              !isMap &&
              Object.entries(res[values.entrypoint.kind]).every(
                x => !isNaN(Number(x[0]))
              )
                ? {
                    [values.entrypoint.kind]: Object.fromEntries(
                      Object.entries(res[values.entrypoint.kind])
                        .sort((a: any, b: any) => a[0] - b[0])
                        .map((x, i) => [i, x[1]])
                    ),
                  }
                : res;

            res = Array.isArray(res)
              ? res.map(x =>
                  typeof x == "object" && "entrypoint" in x ? x.entrypoint : x
                )
              : res;
            let p = new Parser();
            let param;
            let rawParam;
            let typ;
            let typer: any;

            const allEqual = (arr: string[]) => arr.every(v => v === arr[0]);
            if (typeof res === "object" && "default" in res) {
              rawParam = res.default;
              param = emitMicheline(
                props.shape.schema.methodsObject[values.entrypoint!.kind](
                  rawParam
                ).toTransferParams().parameter.value
              );
              typer = props.shape.schema.parameterSchema.isMultipleEntryPoint
                ? props.shape.schema.entrypoints.entrypoints[
                    values.entrypoint!.kind
                  ]
                : props.shape.schema.parameterSchema.root.val;
              typ = emitMicheline(p.parseJSON(typer), {
                indent: "",
                newline: "",
              });
            } else if (
              typeof res === "object" &&
              Object.values(props.shape.schema.entrypoints.entrypoints).length >
                1 &&
              allEqual(
                Object.values(props.shape.schema.entrypoints.entrypoints).map(
                  x => emitMicheline(p.parseJSON(x as object))
                )
              )
            ) {
              rawParam =
                typeof res === "object" && values!.entrypoint!.kind in res
                  ? res[values!.entrypoint!.kind]
                  : res;
              param = emitMicheline(
                props.shape.schema.methodsObject[values.entrypoint!.kind](
                  rawParam
                ).toTransferParams().parameter.value
              );
              typer = props.shape.schema.parameterSchema.isMultipleEntryPoint
                ? props.shape.schema.entrypoints.entrypoints[
                    values.entrypoint!.kind
                  ]
                : props.shape.schema.parameterSchema.root.val;
              typ = emitMicheline(p.parseJSON(typer), {
                indent: "",
                newline: "",
              });
            } else {
              typer = props.shape.schema.parameterSchema.isMultipleEntryPoint
                ? props.shape.schema.entrypoints.entrypoints[
                    values.entrypoint!.kind
                  ]
                : props.shape.schema.parameterSchema.root.val;
              typ = emitMicheline(p.parseJSON(typer), {
                indent: "",
                newline: "",
              });
              rawParam =
                typeof res === "object" && values!.entrypoint!.kind in res
                  ? res[values!.entrypoint!.kind]
                  : res;
              param = emitMicheline(
                props.shape.schema.methodsObject[values.entrypoint!.kind](
                  rawParam
                ).toTransferParams().parameter.value
              );
            }
            let entry =
              values.entrypoint!.kind !== "default"
                ? `%${values.entrypoint!.kind} `
                : "";
            let pp;
            if (isMap && typer.prim === "big_map") {
              let lol = Object.entries(rawParam);
              let k = emitMicheline(p.parseJSON(typer.args[0]), {
                indent: "",
                newline: "",
              });
              let key = new ParameterSchema(typer.args[0]);
              let v = emitMicheline(p.parseJSON(typer.args[1]), {
                indent: "",
                newline: "",
              });
              let value = new ParameterSchema(typer.args[1]);
              let big_map = `
            EMPTY_BIG_MAP ${k} ${v};
            `;
              pp = lol
                .map(
                  ([k, v]) =>
                    `PUSH ${emitMicheline(p.parseJSON((typer as any).args[1]), {
                      indent: "",
                      newline: "",
                    })} ${emitMicheline(p.parseJSON(value.Encode(v)), {
                      indent: "",
                      newline: "",
                    })};
            SOME;
            PUSH ${emitMicheline(p.parseJSON(typer.args[0]), {
              indent: "",
              newline: "",
            })} ${emitMicheline(p.parseJSON(key.Encode(k)), {
                      indent: "",
                      newline: "",
                    })};
          UPDATE;
          `
                )
                .join("");
              pp = big_map + pp;
            }
            let lambda = `
          {
            DROP;
              PUSH address "${props.address}";
              CONTRACT ${entry} ${typ};
              IF_NONE { PUSH string "contract dosen't exist"; FAILWITH } { };
              PUSH mutez ${props.amount};
              ${
                typer.prim === "big_map" && isMap
                  ? pp
                  : `PUSH ${typ} ${param} ;`
              }
            TRANSFER_TOKENS
        } `;
            props.setField(
              lambda,
              JSON.stringify(
                {
                  contract_addr: props.address,
                  mutez_amount: props.amount,
                  entrypoint: values.entrypoint!.kind,
                  payload: param,
                },
                null,
                2
              )
            );
            props.setLoading(false);
          } catch (e) {
            console.log(e);
            setSubmitError((e as Error).message);
            props.setLoading(false);
          }
        }}
      >
        {({ resetForm }) => (
          <Form className="align-self-center col-span-2 flex w-full grow flex-col items-center justify-center justify-self-center">
            <div className="mb-2 self-center text-2xl font-medium text-white">
              Add items below
            </div>
            <div className="h-fit-content md:min-h-96 mb-2 grid w-full grid-flow-row items-start gap-4 overflow-y-auto">
              {!!props.shape && (
                <RenderItem item={props.shape.form} parent={[]} />
              )}
            </div>
            {!!submitError ? (
              <span className="text-red-600">{submitError}</span>
            ) : null}
            <ErrorMessage name="entrypoint.kind" render={renderError} />
            <div className="mt-4 flex flex-row justify-around space-x-4 md:w-1/3">
              <button
                className="my-2 rounded bg-primary p-2 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500"
                onClick={e => {
                  e.preventDefault();
                  props.reset();
                }}
              >
                Reset
              </button>
              <button
                className="my-2 rounded bg-primary p-2 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500"
                type="submit"
              >
                Confirm
              </button>
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
      <div className="mt-8 mb-2 flex w-full items-center justify-center rounded border-2 border-white p-4 align-middle">
        <ContractLoader loading={loading}></ContractLoader>
      </div>
    );
  }
  if (done) {
    const data = JSON.parse(props.getFieldProps());

    return (
      <div className="mt-8 w-full rounded border-2 border-white p-4 text-white">
        <p className="text-lg text-white">Execute Contract</p>
        <p>
          <span className="font-light">Contract address:</span>{" "}
          <span className="md:hidden">
            <Alias address={data.contract_addr} />
          </span>
          <span className="hidden md:inline">{data.contract_addr}</span>
        </p>
        <p>
          <span className="font-light">Mutez amount:</span> {data.mutez_amount}
        </p>
        <p>
          <span className="font-light">Entrypoint:</span> {data.entrypoint}
        </p>
        <p>
          <span className="font-light">Params:</span> {data.payload}
        </p>
      </div>
    );
  }
  if (!state.address) {
    return (
      <div className=" w-full text-white">
        <p className="mt-4 text-lg text-white">Execute Contract</p>
        <Basic setFormState={x => setState({ ...x, shape: {} })} />
      </div>
    );
  } else {
    return (
      <div className=" w-full text-white">
        <p className="mt-4 text-lg text-white">Execute Contract</p>
        <ExecuteForm
          loading={loading}
          setLoading={setLoader}
          shape={state.shape}
          setState={shape => {
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
  const router = useRouter();
  let portalIdx = useRef(0);

  const [loading, setLoading] = useState(false);
  const [timeoutAndHash, setTimeoutAndHash] = useState([false, ""]);
  const [result, setResult] = useState<boolean | undefined>(undefined);

  if (state?.address == null) {
    return null;
  }

  if (timeoutAndHash[0]) {
    return (
      <div className="mx-auto mt-4 w-full text-center text-zinc-400 lg:w-1/2">
        <p>
          The wallet {"can't"} confirm that the transaction has been validated.
          You can check it in{" "}
          <a
            className="text-zinc-200 hover:text-zinc-300"
            href={`https://${
              PREFERED_NETWORK === NetworkType.GHOSTNET ? "ghostnet." : ""
            }tzkt.io/${timeoutAndHash[1]}`}
            target="_blank"
            rel="noreferrer"
          >
            the explorer
          </a>
          , and if it is, {"it'll"} appear in the proposals
        </p>
        <div className="mt-8 w-full space-x-4">
          <button
            className="rounded border-2 bg-transparent px-4 py-2 font-medium text-white hover:outline-none"
            onClick={() => {
              setResult(undefined);
              setTimeoutAndHash([false, ""]);
            }}
          >
            Back to proposal creation
          </button>
          <button
            className="rounded border-2 border-primary bg-primary px-4 py-2 text-white hover:border-red-500 hover:bg-red-500"
            onClick={() => {
              router.push("/proposals");
            }}
          >
            Go to proposals
          </button>
        </div>
      </div>
    );
  }

  if (loading && typeof result == "undefined") {
    return (
      <div className="flex w-full flex-col items-center justify-center">
        <ContractLoader loading={loading}></ContractLoader>
        <span className="mt-4 text-zinc-400">
          Sending and waiting for transaction confirmation (It may take a few
          minutes)
        </span>
      </div>
    );
  }
  if (!loading && typeof result != "undefined") {
    return (
      <div className="flex w-full items-center justify-between md:h-12">
        <ContractLoader loading={loading}>
          <div className="my-auto text-sm font-bold text-white md:text-xl">
            {result ? (
              <div className="my-auto flex flex-row text-sm font-bold text-white md:text-xl">
                <span>Created proposal successfully</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="ml-4 h-6 w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
              </div>
            ) : (
              <span className="my-auto text-sm font-bold text-white md:text-xl">
                Failed to create proposal
              </span>
            )}
          </div>
        </ContractLoader>
      </div>
    );
  }

  const initialProps: {
    transfers: {
      type: "lambda" | "transfer" | "contract" | "fa2";
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
      validate={values => {
        const errors: {
          transfers: { values: { [key: string]: string } }[];
        } = {
          transfers: [],
        };
        values.transfers.forEach((element, idx) => {
          Object.entries(element.values).forEach(([labl, value]) => {
            let field = element.fields.find(x => x.field === labl);
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
      onSubmit={async values => {
        setLoading(true);
        try {
          let cc = await state.connection.contract.at(props.address);

          let versioned = VersionedApi(props.contract.version, props.address);
          setTimeoutAndHash(
            await versioned.submitTxProposals(cc, state.connection, values)
          );
          setResult(true);
        } catch (e) {
          console.log(e);
          setResult(false);
        }
        setLoading(false);
        setTimeout(() => {
          setResult(undefined);
        }, MODAL_TIMEOUT);
      }}
    >
      {({ values, errors, setFieldValue, getFieldProps }) => (
        <Form className="align-self-center col-span-2 flex w-full grow flex-col items-center justify-center justify-self-center">
          <div className="mb-2 grid w-full grid-flow-row items-start gap-4">
            <FieldArray name="transfers">
              {({ remove, push, replace }) => (
                <div className="flex h-fit min-w-full flex-col " id="top">
                  <div className="mb-8 flex flex-col sm:flex-row">
                    <button
                      type="button"
                      className="my-2 mx-auto block self-center justify-self-center rounded bg-primary p-2 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500"
                      onClick={e => {
                        e.preventDefault();
                        push({
                          type: "transfer",
                          key: values.transfers.length,
                          ...Versioned.transferForm(props.contract),
                        });
                      }}
                    >
                      Transfer
                    </button>
                    <button
                      type="button"
                      className="my-2 mx-auto block self-center justify-self-center rounded bg-primary p-2 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500"
                      onClick={e => {
                        e.preventDefault();
                        push({
                          type: "fa2",
                          ...Versioned.fa2(props.contract),
                        });
                      }}
                    >
                      FA2 Transfer
                    </button>
                    <button
                      type="button"
                      className="my-2 mx-auto block self-center justify-self-center rounded bg-primary p-2 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500"
                      onClick={e => {
                        e.preventDefault();
                        let idx = portalIdx.current;
                        portalIdx.current += 1;
                        push({
                          type: "contract",
                          key: idx,
                          ...Versioned.lambdaForm(props.contract),
                        });
                      }}
                    >
                      Contract Execution
                    </button>
                    {/* <button
                      type="button"
                      className="my-2 mx-auto block self-center justify-self-center rounded bg-primary p-2 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500"
                      onClick={e => {
                        e.preventDefault();
                        push({
                          type: "lambda",
                          ...Versioned.lambdaForm(props.contract),
                        });
                      }}
                    >
                      Lambda Execution
                    </button> */}
                  </div>
                  {values.transfers.length > 0 &&
                    values.transfers.map((transfer, index) => {
                      if (transfer.type === "contract") {
                        return ReactDOM.createPortal(
                          <div
                            className="flex flex-col md:flex-row md:space-x-4"
                            key={(transfer as any).key.toString()}
                            id={(transfer as any).key.toString()}
                          >
                            <ExecuteContractForm
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
                                " mx-none mt-4 block self-center justify-self-end rounded bg-primary p-1.5 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500 md:mx-auto md:mt-0 md:self-end"
                              }
                              onClick={e => {
                                e.preventDefault();
                                remove(index);
                              }}
                            >
                              Remove
                            </button>
                          </div>,
                          document.getElementById("top")!,
                          (transfer as any).key.toString()
                        );
                      }
                      const withTextArea = transfer.fields.find(
                        x => x?.kind === "textarea"
                      )
                        ? " flex-col md:flex-col"
                        : "";

                      return (
                        <>
                          <p className="text-lg text-white">
                            {!transfer.fields.find(v => v.kind === "textarea")
                              ? "Transfer"
                              : "Execute lambda"}
                          </p>
                          <div
                            className={
                              withTextArea +
                              "md:p-none mt-2 flex h-fit min-h-fit min-w-full flex-col items-start justify-around space-y-4 md:flex-row md:space-y-0 md:space-x-4  md:rounded-none md:border-none"
                            }
                            key={index}
                          >
                            {transfer.fields.map((value, idx, arr) => {
                              const withTextArea = transfer.fields.find(
                                x => x?.kind === "textarea"
                              )
                                ? " w-full md:w-full "
                                : "";
                              let width =
                                arr.length === 1 &&
                                !transfer.fields.find(
                                  x => x?.kind === "textarea"
                                )
                                  ? " w-3/4 "
                                  : "";
                              let classn = `${
                                (idx + 1) % 2 === 0
                                  ? `relative flex flex-col justify-start`
                                  : "flex flex-col"
                              } ${
                                !!value.kind && value.kind === "input-complete"
                                  ? "w-full md:grow"
                                  : ""
                              }`;

                              return (
                                <div
                                  className={`${
                                    classn + width + withTextArea
                                  } w-full md:w-auto`}
                                  key={idx}
                                >
                                  <label className="mb-1 text-white">
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
                                      filter={_ => true}
                                      byAddrToo={true}
                                      as="input"
                                      name={`transfers.${index}.values.${value.field}`}
                                      className={
                                        "md:text-md relative h-fit min-h-fit w-full p-2 text-sm" +
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
                                        "md:text-md relative h-fit min-h-fit w-full rounded p-2 text-sm md:w-auto " +
                                        withTextArea
                                      }
                                      placeholder={value.placeholder}
                                      rows={10}
                                      validate={value.validate}
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
                                " mx-none mt-4 block self-center justify-self-end rounded bg-primary p-1.5 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500 md:mx-auto md:mt-0 md:self-end"
                              }
                              onClick={e => {
                                e.preventDefault();

                                remove(index);
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </>
                      );
                    })}
                </div>
              )}
            </FieldArray>
          </div>
          <div className="flex flex-row justify-around md:w-1/3">
            {values.transfers.length > 0 && (
              <button
                className="mt-8 rounded bg-primary p-2 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500"
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
