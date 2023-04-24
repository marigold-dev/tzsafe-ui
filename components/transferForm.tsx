import { NetworkType } from "@airgap/beacon-sdk";
import { Cross1Icon, HamburgerMenuIcon } from "@radix-ui/react-icons";
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
  ChangeEvent,
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
import { debounce } from "../utils/timeout";
import { VersionedApi } from "../versioned/apis";
import { Versioned } from "../versioned/interface";
import Alias from "./Alias";
import ExecuteForm from "./ContractExecution";
import Spinner from "./Spinner";
import ContractLoader from "./contractLoader";
import renderError from "./formUtils";
import TextInputWithCompletion from "./textInputWithComplete";

type Nullable<T> = T | null | undefined;

function Basic({
  setFormState,
  defaultValues,
  withContinue = true,
  address,
  onAmountChange,
  onAddressChange,
}: React.PropsWithoutRef<{
  setFormState: (x: { address: string; amount: number }) => void;
  defaultValues?: { amount: number | undefined; address: string | undefined };
  withContinue?: boolean;
  onAmountChange?: (value: number) => any;
  onAddressChange?: (value: string) => any;
  address?: string;
}>) {
  const state = useContext(AppStateContext)!;
  const [localFormState, setLocalFormState] = useState({
    amount: 0,
    address: "",
  });
  const [contractLoading, setContractLoading] = useState(false);

  const [errors, setErrors] = useState<{
    amount: Nullable<string>;
    address: Nullable<string>;
  }>({ amount: undefined, address: undefined });

  const validate = async (newState: typeof localFormState) => {
    const newErrors: typeof errors = {
      amount: undefined,
      address: undefined,
    };

    if (
      newState.address !== "" &&
      validateContractAddress(newState.address.trim()) !== 3
    ) {
      newErrors.address = `Invalid address ${newState.address}`;
    }

    const exists = await (async () => {
      try {
        await state.connection.contract.at(newState.address.trim());
        return true;
      } catch (e) {
        return false;
      }
    })();

    if (newState.address !== "" && !exists) {
      newErrors.address = `Contract does not exist at address ${newState.address}`;
    }

    if (isNaN(newState.amount) || newState.amount < 0) {
      newErrors.amount = "Invalid amount " + newState.amount;
    }

    if (
      errors.amount === newErrors.amount &&
      errors.address === newErrors.address
    )
      return errors;

    setErrors(newErrors);

    return newErrors;
  };

  const validateAndSetState = async (newState: typeof localFormState) => {
    const errors = await validate(newState);

    if (!!errors.address || !!errors.amount) return true;

    setLocalFormState(newState);

    return false;
  };

  return (
    <div className="align-self-center col-span-1 flex w-full flex-col items-center justify-center justify-self-center">
      <div className="flex w-full flex-col justify-center space-y-2 md:flex-col">
        <div className="flex w-full flex-col ">
          <div className="flex w-full flex-col items-start">
            <label className="font-medium text-white">Contract address</label>
            <div className="relative w-full">
              {!!address ? (
                <span className="text-zinc-400">{address}</span>
              ) : (
                <>
                  <TextInputWithCompletion
                    defaultValue={defaultValues?.address}
                    setTerms={() => {}}
                    onOwnChange={(address: string) =>
                      debounce(async () => {
                        setContractLoading(true);
                        const hasError = await validateAndSetState({
                          ...localFormState,
                          address,
                        });
                        setContractLoading(false);
                      }, 300)
                    }
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
                  {contractLoading && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2">
                      <Spinner />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          {!!errors.address && renderError(errors.address)}
        </div>
        <div className="flex w-full flex-col">
          <div className="flex w-full flex-col items-start">
            <label className="font-medium text-white">Amount in mutez</label>
            <Field
              name="amount"
              className=" w-full rounded p-2 text-black"
              placeholder="0"
              onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                const amount = Number(e.target.value.trim());
                const hasError = await validateAndSetState({
                  ...localFormState,
                  amount,
                });

                if (hasError) return;

                onAmountChange?.(amount);
              }}
              defaultValue={defaultValues?.amount}
            />
          </div>
          {!!errors.amount && renderError(errors.amount)}
        </div>
      </div>
      {withContinue && (
        <button
          className="my-2 rounded bg-primary p-2 font-medium text-white  hover:outline-none "
          type="button"
          onClick={async () => {
            const errors = await validate(localFormState);
            if (!!errors.amount || !!errors.address) return;
            onAddressChange?.(localFormState.address);
          }}
        >
          Continue
        </button>
      )}
    </div>
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
  const setLoader = useCallback((x: boolean) => setLoading(x), []);
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

  return (
    <div className="w-full text-white">
      <p className="text-lg text-white">Execute Contract</p>
      <Basic
        setFormState={x => setState({ ...x, shape: {} })}
        onAmountChange={amount => {
          setState({ ...state, amount });
        }}
        onAddressChange={address => {
          setState({ ...state, address });
        }}
        defaultValues={{
          amount: state.amount === 0 ? undefined : state.amount,
          address: state.address,
        }}
        withContinue={!state.address}
        address={state.address}
      />
      {!!state.address && (
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
          }}
        />
      )}
    </div>
  );
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

  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [timeoutAndHash, setTimeoutAndHash] = useState([false, ""]);
  const [result, setResult] = useState<boolean | undefined>(undefined);
  const [formState, setFormState] = useState(() => initialProps);

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

  return (
    <Formik
      initialValues={formState}
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
        setFormState(values);
        setLoading(true);
        try {
          let cc = await state.connection.contract.at(props.address);

          let versioned = VersionedApi(props.contract.version, props.address);
          setTimeoutAndHash(
            await versioned.submitTxProposals(cc, state.connection, values)
          );
          setResult(true);
          setFormState(initialProps);
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
              {({ remove, replace, unshift, form }) => (
                <div
                  className="flex h-fit min-w-full flex-col lg:flex-row-reverse"
                  id="top"
                >
                  <div
                    className={`sticky z-10 ${
                      state.hasBanner ? "top-36" : "top-24"
                    } ${
                      isMenuOpen ? "w-full" : "ml-auto h-8 w-8 overflow-hidden"
                    } inline-block w-full self-start rounded bg-zinc-700 p-4 lg:h-auto lg:w-1/5`}
                  >
                    <button
                      type="button"
                      className={`absolute ${
                        isMenuOpen ? "right-4 top-4" : "right-2 top-2"
                      } text-white lg:hidden`}
                      onClick={() => setIsMenuOpen(v => !v)}
                    >
                      {isMenuOpen ? <Cross1Icon /> : <HamburgerMenuIcon />}
                    </button>
                    <div
                      className={`${
                        isMenuOpen ? "" : "hidden lg:block"
                      } space-y-4`}
                    >
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
                          addNewField(
                            e,
                            unshift,
                            "contract",
                            portalIdx.current,
                            Versioned.lambdaForm(props.contract)
                          );

                          portalIdx.current += 1;
                        }}
                      >
                        Contract Execution
                      </button>
                    </div>
                    <div className="mt-4 h-px w-full bg-zinc-500"></div>
                    <button
                      type="button"
                      className="mt-4 w-full rounded bg-primary p-2 font-medium text-white hover:bg-red-500 focus:bg-red-500"
                      onClick={() => form.resetForm()}
                    >
                      Clean all
                    </button>
                  </div>

                  <div className="mt-6 w-full space-y-6 lg:mt-0 lg:w-4/5 lg:pr-8">
                    {values.transfers.length > 0 &&
                      values.transfers.map((transfer, index) => {
                        if (transfer.type === "contract") {
                          console.log("HERE:", transfer);
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
                                  "mx-none mt-4 block self-center justify-self-end rounded bg-primary p-1.5 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500 md:mx-auto md:mt-0 md:self-end"
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
                                ? transfer.type === "fa2"
                                  ? "Transfer FA2"
                                  : "Transfer"
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
