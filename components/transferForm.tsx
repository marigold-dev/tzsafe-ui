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
import ExecuteForm from "./ContractExecution";
import ContractLoader from "./contractLoader";
import renderError from "./formUtils";
import TextInputWithCompletion from "./textInputWithComplete";

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
        const errors: any = {};
        if (validateContractAddress(values.walletAddress.trim()) !== 3) {
          errors.walletAddress = `Invalid address ${values.walletAddress}`;
        }
        const exists = await (async () => {
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
function ExecuteContractForm(
  props: React.PropsWithoutRef<{
    setField: (lambda: string, metadata: string) => void;
    getFieldProps: () => string;
  }>
) {
  const [state, setState] = useState({ address: "", amount: 0, shape: {} });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const setLoader = useCallback((x: boolean) => {
    setLoading((prev: boolean) => {
      if (prev == x) {
        return prev;
      }
      return x;
    });
  }, []);
  const setStater = useCallback(({ shape }: { shape: object }) => {
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
          <span className="font-light">Entrypoint :</span> {data.entrypoint}
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

const addNewField = (
  e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  func: <T>(value: T) => number,
  type: string,
  key: number | undefined,
  rest: any
) => {
  e.preventDefault();
  func({
    type,
    key,
    ...rest,
  });
  if (window.scrollY > 200) window.scrollTo(0, 0);
};

function TransferForm(
  props: React.PropsWithoutRef<{
    address: string;
    closeModal: () => void;
    contract: contractStorage;
  }>
) {
  const state = useContext(AppStateContext)!;
  const router = useRouter();
  const portalIdx = useRef(0);

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
          <div className="relative mb-2 grid w-full grid-flow-row items-start gap-4">
            <FieldArray name="transfers">
              {({ remove, replace, unshift }) => (
                <div
                  className="flex h-fit min-w-full flex-row-reverse "
                  id="top"
                >
                  <div className="sticky top-24 inline-block w-1/5 space-y-4 self-start rounded bg-zinc-700 p-4">
                    <h4 className="text-white">Add a ? to the proposal</h4>
                    <button
                      type="button"
                      className="w-full rounded bg-primary p-2 font-medium text-white hover:bg-red-500 focus:bg-red-500"
                      onClick={e => {
                        addNewField(
                          e,
                          unshift,
                          "transfer",
                          values.transfers.length,
                          Versioned.transferForm(props.contract)
                        );
                      }}
                    >
                      Transfer
                    </button>
                    <button
                      type="button"
                      className="w-full rounded bg-primary p-2 font-medium text-white hover:bg-red-500 focus:bg-red-500"
                      onClick={e => {
                        addNewField(
                          e,
                          unshift,
                          "fa2",
                          undefined,
                          Versioned.fa2(props.contract)
                        );
                      }}
                    >
                      FA2 Transfer
                    </button>
                    <button
                      type="button"
                      className="w-full rounded bg-primary p-2 font-medium text-white hover:bg-red-500 focus:bg-red-500"
                      onClick={e => {
                        e.preventDefault();
                        let idx = portalIdx.current;
                        portalIdx.current += 1;
                        unshift({
                          type: "contract",
                          key: idx,
                          ...Versioned.lambdaForm(props.contract),
                        });
                      }}
                    >
                      Contract Execution
                    </button>
                  </div>

                  {/* <div className="mb-8 flex flex-col sm:flex-row">
                    
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
                    </button> 
                  </div> */}
                  <div className="w-4/5 space-y-6 pr-8">
                    {values.transfers.length > 0 &&
                      values.transfers.map((transfer, index) => {
                        if (transfer.type === "contract") {
                          // return ReactDOM.createPortal(
                          return (
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
                                setField={(
                                  lambda: string,
                                  metadata: string
                                ) => {
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
                            </div>
                          );
                          // ,document.getElementById("top")!,
                          // (transfer as any).key.toString()
                          // );
                        }
                        const withTextArea = transfer.fields.find(
                          x => x?.kind === "textarea"
                        )
                          ? " flex-col md:flex-col"
                          : "";

                        return (
                          <section key={`${transfer.type}:${index}`}>
                            <p className="text-lg text-white">
                              {!transfer.fields.find(v => v.kind === "textarea")
                                ? "Transfer"
                                : "Execute lambda"}
                            </p>
                            <div
                              className={
                                withTextArea +
                                "md:p-none flex h-fit min-h-fit min-w-full flex-col items-start justify-around space-y-4 md:flex-row md:space-y-0 md:space-x-4  md:rounded-none md:border-none"
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
                                  !!value.kind &&
                                  value.kind === "input-complete"
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
                          </section>
                        );
                      })}
                    <div className="flex flex-row justify-around md:mx-auto md:w-1/3">
                      {values.transfers.length > 0 && (
                        <button
                          className="mt-8 rounded bg-primary p-2 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500"
                          type="submit"
                        >
                          Submit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </FieldArray>
          </div>
        </Form>
      )}
    </Formik>
  );
}

export default TransferForm;
