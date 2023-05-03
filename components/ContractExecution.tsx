import assertNever from "assert-never";
import {
  ErrorMessage,
  Field,
  FieldArray,
  FieldProps,
  Form,
  Formik,
  useFormikContext,
} from "formik";
import React, { useContext, useEffect, useState } from "react";
import { AppStateContext } from "../context/state";
import {
  parseContract,
  genLambda,
  getFieldName,
  showName,
  allocateNewTokenCounter,
  token,
  tokenValueType,
  tokenMap,
} from "../utils/contractParam";
import renderError from "./formUtils";

function capitalizeFirstLetter(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function RenderItem({
  token: token,
  showTitle: showTitle,
}: React.PropsWithoutRef<{
  token: token;
  showTitle: boolean;
}>) {
  const { setFieldValue, getFieldProps } =
    useFormikContext<Record<string, tokenValueType>>();
  const counter: number = getFieldProps("counter").value;
  const fieldName = getFieldName(token.counter);
  const fieldValue: tokenValueType = getFieldProps(fieldName).value;

  try {
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
      case "int":
      case "nat":
      case "mutez":
      case "timestamp":
      case "sapling_transaction_deprecated":
      case "sapling_transaction":
      case "sapling_state":
        return RenderInputField(token, fieldName, showTitle);
      case "never":
      case "unit":
        return RenderConstant(token, showTitle);
      case "bool":
        return RenderCheckbox(token, fieldName, fieldValue, showTitle);
      case "or":
        return RenderSelection(token, fieldName, fieldValue, showTitle);
      case "set":
      case "list":
        return RenderArray(
          token,
          fieldName,
          fieldValue,
          showTitle,
          counter,
          setFieldValue
        );
      case "pair":
        return RenderPair(token, showTitle);
      case "map":
        return RenderMap(
          token,
          fieldName,
          fieldValue,
          showTitle,
          counter,
          setFieldValue
        );
      case "option":
        return RenderOption(token, fieldName, fieldValue, showTitle);
      case "lambda":
        return RenderLambda(token, fieldName, showTitle);
      case "ticket_deprecated":
      case "ticket":
      case "operation":
      case "chest":
      case "chest_key":
      case "tx_rollup_l2_address":
      case "constant":
      case "big_map":
        return RenderNonsupport(token);
      default:
        return assertNever(token.type);
    }
  } catch (e) {
    return renderError((e as Error).message);
  }
}

function RenderNonsupport(token: token) {
  return (
    <div className="flex w-full flex-col gap-2 rounded border-2 p-4">
      {`Type, ${token.type}, isn't supported as a user input`}
    </div>
  );
}

function RenderLambda(token: token, fieldName: string, showTitle: boolean) {
  return (
    <div className="mt-1 grid w-full grid-flow-row grid-cols-1 gap-2">
      <label className="text-white">
        {showTitle && showName(token.type, token.name)}
      </label>
      <Field
        as="textarea"
        className="md:text-md relative h-fit min-h-fit w-full rounded p-2 text-black"
        placeholder={token.placeholder}
        rows={10}
        name={fieldName}
        validate={token.validate}
      />
      <ErrorMessage name={fieldName} render={renderError} />
    </div>
  );
}

function RenderOption(
  token: token,
  fieldName: string,
  value: tokenValueType,
  showTitle: boolean
) {
  if (typeof value !== "string") {
    throw new Error("internal error: the value of option is incorrect");
  }
  return (
    <div className="flex w-full flex-col gap-2 rounded">
      <label className="text-white">
        {showTitle && showName(token.type, token.name)}
      </label>
      <Field
        className="rounded p-2 text-left text-black"
        name={fieldName}
        as="select"
      >
        <option className="text-black" key="1" value="none">
          None
        </option>
        <option className="text-black" key="2" value="some">
          Some
        </option>
      </Field>
      {value == "some" ? (
        <RenderItem token={token.children[0]} showTitle={true} />
      ) : (
        <div></div>
      )}
    </div>
  );
}

function RenderMap(
  token: token,
  fieldName: string,
  elements: tokenValueType,
  showTitle: boolean,
  counter: number,
  setFieldValue: (
    field: string,
    value: tokenValueType,
    shouldValidate?: boolean | undefined
  ) => void
) {
  if (!Array.isArray(elements)) {
    throw new Error("internal: the value of array is incorrect");
  }
  return (
    <div className="flex w-full flex-col gap-2 rounded">
      <label className="text-white">
        {showTitle && showName(token.type, token.name)}
      </label>
      <FieldArray name={fieldName}>
        {({ push, pop }) => {
          return (
            <div className="flex w-full flex-col gap-2 rounded border-2 p-4">
              {elements &&
                elements.map((element, idx) => {
                  if ("counter" in element) {
                    throw new Error(
                      "internal error: the value of array is incorrect"
                    );
                  }
                  return (
                    <div
                      key={idx}
                      className="mt-1 grid w-full grid-flow-row grid-cols-1 gap-2"
                    >
                      <RenderItem token={element.key} showTitle={true} />
                      <RenderItem token={element.value} showTitle={true} />
                    </div>
                  );
                })}
              <div className="mt-2 flex flex-col md:flex-row">
                {elements && elements.length > 0 && (
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

                    const new_counter = allocateNewTokenCounter(
                      token,
                      counter,
                      setFieldValue
                    );
                    const child: tokenMap = {
                      key: token.children[0],
                      value: token.children[1],
                    };
                    push(child);
                    setFieldValue("counter", new_counter);
                  }}
                >
                  Add item
                </button>
              </div>
            </div>
          );
        }}
      </FieldArray>
    </div>
  );
}

function RenderPair(token: token, showTitle: boolean) {
  return (
    <div className="flex w-full flex-col gap-2 rounded">
      <label className="text-white">
        {showTitle && showName(token.type, token.name)}
      </label>
      {
        <div className="flex w-full flex-col gap-2 rounded border-2 p-4">
          {token.children.map((v, idx) => {
            return (
              <div
                key={idx}
                className="mt-1 grid w-full grid-flow-row grid-cols-1 gap-2"
              >
                <RenderItem token={v} showTitle={true} />
              </div>
            );
          })}
        </div>
      }
    </div>
  );
}

function RenderArray(
  token: token,
  fieldName: string,
  elements: tokenValueType,
  showTitle: boolean,
  counter: number,
  setFieldValue: (
    field: string,
    value: tokenValueType,
    shouldValidate?: boolean | undefined
  ) => void
) {
  if (!Array.isArray(elements)) {
    throw new Error("internal error: the value of array is incorrect");
  }
  return (
    <div className="mt-1 grid w-full grid-flow-row grid-cols-1 gap-2">
      <label className="text-white">
        {showTitle && showName(token.type, token.name)}
      </label>
      <FieldArray name={fieldName}>
        {({ push, pop }) => {
          return (
            <div className="flex w-full flex-col gap-2 rounded border-2 p-4">
              {elements &&
                elements.map((v, idx) => {
                  if (!("counter" in v)) {
                    throw new Error(
                      "internal error: the value of array is incorrect"
                    );
                  }
                  return (
                    <div
                      key={idx}
                      className="mt-1 grid w-full grid-flow-row grid-cols-1 gap-2"
                    >
                      <RenderItem token={v} showTitle={false} />
                    </div>
                  );
                })}
              <div className="mt-2 flex flex-col md:flex-row">
                {elements && elements.length > 0 && (
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
                    const new_counter = allocateNewTokenCounter(
                      token,
                      counter,
                      setFieldValue
                    );
                    setFieldValue("counter", new_counter);
                    push(token.children[0]);
                  }}
                >
                  Add item
                </button>
              </div>
            </div>
          );
        }}
      </FieldArray>
    </div>
  );
}

function RenderSelection(
  token: token,
  fieldName: string,
  selected: tokenValueType,
  showTitle: boolean
) {
  const { setFieldValue, setFieldError } = useFormikContext();

  const defaultChildToken =
    token.children.length > 0 ? token.children[0] : undefined;
  const childToken =
    token.children.find(x => {
      return selected && x.name == selected;
    }) || defaultChildToken;

  return (
    <div className="flex w-full flex-col gap-2 rounded">
      <label className="text-white">
        {showTitle && showName(token.type, token.name)}
      </label>
      <Field name={fieldName}>
        {({ field }: FieldProps) => (
          <select
            {...field}
            className="rounded p-2 text-left text-black"
            onChange={e => {
              field.onChange(e);
              if (!childToken) return;

              setFieldError(getFieldName(childToken.counter), undefined);
            }}
          >
            {Object.entries(token.children).map(([k, v]) => {
              return (
                <option className="text-black" key={k} value={v.name}>
                  {v.name}
                </option>
              );
            })}
          </select>
        )}
      </Field>
      {childToken ? (
        <RenderItem token={childToken} showTitle={false} />
      ) : (
        <div></div>
      )}
    </div>
  );
}

function RenderCheckbox(
  token: token,
  fieldName: string,
  values: tokenValueType,
  showTitle: boolean
) {
  if (typeof values !== "boolean") {
    throw new Error("internal error: the value of bool is incorrect");
  } else {
    return (
      <div className="mt-1 grid w-full grid-flow-row grid-cols-1 gap-2">
        <label className="text-white">
          {showTitle && showName(token.type, token.name)}
        </label>
        <div>
          <Field
            className="rounded p-2 text-left text-black"
            name={fieldName}
            type="checkbox"
          />{" "}
          {capitalizeFirstLetter(`${values}`)}
        </div>
      </div>
    );
  }
}

function RenderConstant(token: token, showTitle: boolean) {
  return (
    <div className="mt-1 grid w-full grid-flow-row grid-cols-1 gap-2">
      <label className="text-white">
        {showTitle && showName(token.type, token.name)}
      </label>
      <div className="md:text-md text-while relative h-fit min-h-fit w-full rounded p-2">
        <p>{capitalizeFirstLetter(token.type)}</p>
      </div>
    </div>
  );
}

function RenderInputField(token: token, fieldName: string, showTitle: boolean) {
  return (
    <div className="mt-1 grid w-full grid-flow-row grid-cols-1 gap-2">
      <label className="text-white">
        {showTitle && showName(token.type, token.name)}
      </label>
      <Field
        as="input"
        className="md:text-md relative h-fit min-h-fit w-full rounded p-2 text-black"
        placeholder={token.placeholder}
        rows={10}
        name={fieldName}
        validate={token.validate}
      />
      <ErrorMessage name={fieldName} render={renderError} />
    </div>
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
    onReset?: () => void;
    loading: boolean;
    onShapeChange: (v: object) => void;
  }>
) {
  const state = useContext(AppStateContext)!;

  const address = props.address;
  const conn = state.connection;
  const setLoading = props.setLoading;
  const loading = props.loading;

  useEffect(() => {
    if (!Object.keys(props.shape).length && !loading) {
      (async () => {
        try {
          setLoading(true);
          const c = await conn.contract.at(address);
          const initTokenTable: Record<string, tokenValueType> = {};
          const token: token = parseContract(c, initTokenTable);

          props.setState({
            init: initTokenTable,
            token,
            contract: c,
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
    <div className="w-full text-white">
      <Formik
        enableReinitialize
        initialValues={props.shape.init}
        onSubmit={() => {}}
        validateOnMount={true}
        validate={values => {
          props.onShapeChange(values);
          try {
            genLambda(props, values);
          } catch (e) {
            // setSubmitError((e as Error).message);
          }
        }}
      >
        {_ => (
          <Form className="align-self-center col-span-2 flex w-full grow flex-col items-center justify-center justify-self-center">
            <div className="h-fit-content md:min-h-96 mb-2 grid w-full grid-flow-row items-start gap-4 overflow-y-auto">
              {!!props.shape.token && (
                <RenderItem token={props.shape.token} showTitle={false} />
              )}
            </div>
            <div className="mt-4 flex flex-row justify-around md:w-1/3">
              <button
                className="rounded bg-primary p-2 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500"
                onClick={e => {
                  e.preventDefault();
                  props.reset();
                  props.onReset?.();
                }}
              >
                Reset
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
}
export default ExecuteForm;
