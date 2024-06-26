import { NetworkType } from "@airgap/beacon-sdk";
import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import {
  validateContractAddress,
  ValidationResult,
  validateAddress,
} from "@taquito/utils";
import BigNumber from "bignumber.js";
import {
  Field,
  FieldArray,
  FieldProps,
  Form,
  Formik,
  useField,
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
import { MODAL_TIMEOUT, PREFERED_NETWORK } from "../context/config";
import { AppStateContext, contractStorage } from "../context/state";
import { tezToMutez } from "../utils/tez";
import { VersionedApi } from "../versioned/apis";
import { Versioned, proposals, transfer } from "../versioned/interface";
import {
  hasTzip27Support,
  hasTzip27SupportWithPoEChallenge,
} from "../versioned/util";
import Alias from "./Alias";
import ExecuteForm from "./ContractExecution";
import ErrorMessage from "./ErrorMessage";
import FA1_2 from "./FA1_2";
import FA2Transfer from "./FA2Transfer";
import Spinner from "./Spinner";
import ContractLoader from "./contractLoader";
import renderError, { renderWarning } from "./formUtils";
import TextInputWithCompletion from "./textInputWithComplete";

type Nullable<T> = T | null | undefined;

function Basic({
  id,
  setFormState,
  defaultValues,
  withContinue = true,
  address,
  onAmountChange,
  onAddressChange,
}: React.PropsWithoutRef<{
  id: number;
  setFormState: (x: { address: string; amount: number }) => void;
  defaultValues?: { amount: number | undefined; address: string | undefined };
  withContinue?: boolean;
  onAmountChange?: (value: string) => any;
  onAddressChange?: (value: string) => any;
  address?: string;
}>) {
  const { getFieldProps, validateField } = useFormikContext();
  const [
    { value: addressValue },
    { error: addressError, touched: addressTouched },
    { setTouched: setAddressTouched },
  ] = useField(`transfers.${id}.walletAddress`);

  const state = useContext(AppStateContext)!;
  const [localFormState, setLocalFormState] = useState<{
    amount: number | undefined;
    address: string;
  }>({
    amount: undefined,
    address: "",
  });
  const [contractLoading, setContractLoading] = useState(false);

  const [errors, setErrors] = useState<{
    amount: Nullable<string>;
    address: Nullable<string>;
  }>({ amount: undefined, address: undefined });

  return (
    <div className="align-self-center col-span-1 flex w-full flex-col items-center justify-center justify-self-center">
      <div className="flex w-full flex-col justify-center space-x-0 space-y-2 md:flex-row md:space-x-4 md:space-y-0">
        <div className="flex w-full flex-col">
          <div className="flex w-full flex-col items-start">
            <label className="font-medium text-white">Contract address</label>
            <div className="relative w-full">
              {!!address ? (
                <span className="text-zinc-400">
                  <Alias address={address} length={10} />
                </span>
              ) : (
                <>
                  <TextInputWithCompletion
                    defaultValue={defaultValues?.address}
                    setTerms={() => {}}
                    filter={x =>
                      validateContractAddress((x as string).trim()) === 3
                    }
                    byAddrToo={true}
                    as="input"
                    name={`transfers.${id}.walletAddress`}
                    className=" w-full p-2 text-black"
                    placeholder={"contract address"}
                    rows={10}
                    validate={async address => {
                      if (localFormState.address === address)
                        return addressError;

                      setLocalFormState({ ...localFormState, address });

                      if (!address) return "Address can't be empty";

                      if (
                        !!address &&
                        validateContractAddress(address.trim()) !==
                          ValidationResult.VALID
                      )
                        return `Invalid address ${address}`;

                      setContractLoading(true);
                      const exists = await (async () => {
                        try {
                          await state.connection.contract.at(address.trim());
                          return true;
                        } catch (e) {
                          return false;
                        }
                      })();
                      setContractLoading(false);

                      if (address !== "" && !exists)
                        return `Contract does not exist at address ${address}`;

                      return undefined;
                    }}
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
          <ErrorMessage name={`transfers.${id}.walletAddress`} />
        </div>
        <div className="flex w-full flex-col">
          <div className="flex w-full flex-col items-start">
            <label className="font-medium text-white">Amount (Tez)</label>
            <Field name={`transfers.${id}.amount`}>
              {({ field }: FieldProps) => (
                <input
                  {...field}
                  className="w-full rounded p-2 text-black"
                  placeholder="0"
                  onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                    field.onChange(e);
                    const value = e.target.value.trim();
                    const amount = Number(value === "" ? NaN : value);

                    if (
                      value !== "" &&
                      (isNaN(amount ?? NaN) || (amount ?? -1) < 0)
                    ) {
                      setErrors({
                        ...errors,
                        amount:
                          amount === undefined
                            ? ""
                            : "Invalid amount " + amount,
                      });

                      return;
                    } else {
                      setErrors({ ...errors, amount: undefined });
                    }

                    setLocalFormState({ ...localFormState, amount });
                    onAmountChange?.(e.target.value);
                  }}
                />
              )}
            </Field>
          </div>
          {!!errors.amount && renderError(errors.amount)}
        </div>
      </div>
      {withContinue && (
        <button
          className="mt-4 rounded bg-primary p-2 font-medium text-white hover:outline-none"
          type="button"
          onClick={async () => {
            if (!addressValue) {
              setAddressTouched(true, true);
            }

            if (!!addressError || !!errors.amount) {
              return;
            }

            onAddressChange?.(addressValue);
          }}
        >
          Continue
        </button>
      )}
    </div>
  );
}

type state = {
  address: string;
  amount: number;
  shape: object;
};
function ExecuteContractForm(
  props: React.PropsWithoutRef<{
    setField: (lambda: string, metadata: string) => void;
    getFieldProps: (name: string) => { value: string };
    id: number;
    defaultState?: state;
    onReset: () => void;
    onChange: (state: state) => void;
  }>
) {
  const { submitCount, setFieldValue } = useFormikContext();
  const submitCountRef = useRef(submitCount);

  const [state, setState] = useState(
    () => props.defaultState ?? { address: "", amount: 0, shape: {} }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const setLoader = useCallback((x: boolean) => setLoading(x), []);

  useEffect(() => {
    props.onChange(state);
  }, [state, props.onChange]);

  if (loading) {
    return (
      <div className="mb-2 mt-8 flex w-full items-center justify-center rounded border-2 border-white p-4 align-middle">
        <ContractLoader loading={loading}></ContractLoader>
      </div>
    );
  }

  return (
    <div className="w-full text-white">
      <p className="text-lg text-white">
        <span className="mr-2 text-zinc-500">
          #{(props.id + 1).toString().padStart(2, "0")}
        </span>
        Execute Contract
      </p>
      <Basic
        id={props.id}
        setFormState={x => setState({ ...x, shape: {} })}
        onAmountChange={amount => {
          setState({ ...state, amount: tezToMutez(Number(amount)) });
          setFieldValue(`transfers.${props.id}.amount`, amount);
        }}
        onAddressChange={address => {
          setState({ ...state, address });
        }}
        withContinue={!state.address}
        address={state.address}
        defaultValues={{
          amount: undefined,
          address: undefined,
        }}
      />
      {!!state.address && (
        <ExecuteForm
          loading={loading}
          setLoading={setLoader}
          shape={state.shape}
          onShapeChange={shape => {
            setState(v => ({
              ...v,
              shape: { ...v.shape, init: shape },
            }));
          }}
          setState={shape => {
            setState(v => ({ ...v, shape }));
          }}
          reset={() => setState({ address: "", amount: 0, shape: {} })}
          address={state.address}
          amount={state.amount}
          setField={(lambda: string, metadata: string) => {
            props.setField(lambda, metadata);
          }}
          onReset={() => {
            setState({ address: "", amount: 0, shape: {} });
            props.onReset();
          }}
        />
      )}
      <Field
        name={`transfers.${props.id}.values.lambda`}
        className="hidden"
        validate={(v: string) => {
          // This is a tricky way to detect when the submition happened
          // We want this message to show only on submit, not on every change
          if (!!v) {
            submitCountRef.current = submitCount;
            setError("");
            return;
          }

          if (submitCountRef.current === submitCount - 1) {
            setError("Please fill contract");
            submitCountRef.current += 1;
          }

          // Returning a value to prevent submition
          return true;
        }}
      />
      <Field
        name={`transfers.${props.id}.values.metadata`}
        className="hidden"
        validate={(v: string) => {
          if (!!v) return;

          // Returning a value to prevent submition
          return true;
        }}
      />
      {!!error && renderError(error)}
    </div>
  );
}

const addNewField = (
  e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  func: <T>(value: T) => any,
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

const initialProps = {
  transfers: [] as transfer[],
  signImmediatelyFlag: true,
  resolveImmediatelyFlag: false,
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
  const executeContractStateRef = useRef<{ [k: number]: state }>({});

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
              PREFERED_NETWORK === NetworkType.MAINNET
                ? ""
                : PREFERED_NETWORK === NetworkType.GHOSTNET
                ? "ghostnet."
                : `${PREFERED_NETWORK}.`
            }tzkt.io/${timeoutAndHash[1]}`}
            target="_blank"
            rel="noreferrer"
          >
            the explorer
          </a>
          , and if it is, {"it'll"} appear in the proposals
        </p>
        <div className="mt-8 w-full space-y-4 md:space-x-4 md:space-y-0">
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
              router.push(`/${state.currentContract}/proposals`);
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
            if (!("fields" in element)) return;

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
          const cc = await state.connection.wallet.at(props.address);
          const versioned = VersionedApi(props.contract.version, props.address);
          const proposals: proposals = { transfers: values.transfers };

          setTimeoutAndHash(
            await versioned.submitTxProposals(
              cc,
              state.connection,
              proposals,
              undefined,
              undefined,
              values.signImmediatelyFlag,
              values.resolveImmediatelyFlag
            )
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
      {({ values, errors, setFieldValue, getFieldProps, getFieldHelpers }) => (
        <Form className="align-self-center col-span-2 flex w-full grow flex-col items-center justify-center justify-self-center">
          <div className="relative mb-2 grid w-full grid-flow-row items-start gap-4">
            <FieldArray name="transfers">
              {({ remove, replace, push, form }) => (
                <div
                  className="flex h-fit min-w-full flex-col lg:flex-row-reverse"
                  id="top"
                >
                  <div
                    className={`sticky top-24 z-[5] ${
                      isMenuOpen
                        ? "w-full"
                        : "ml-auto h-12 w-full overflow-hidden"
                    } inline-block w-full self-start rounded bg-zinc-700 p-4 lg:h-auto lg:w-1/5`}
                  >
                    <button
                      type="button"
                      className={`absolute ${
                        isMenuOpen
                          ? "right-2 top-4 justify-end"
                          : "right-2 top-2 justify-between"
                      } -mt-1 flex w-full items-center px-6 py-2 text-white lg:hidden`}
                      onClick={() => setIsMenuOpen(v => !v)}
                    >
                      {isMenuOpen ? (
                        <ChevronUpIcon />
                      ) : (
                        <>
                          <h4 className="mr-4">Add a transaction</h4>
                          <ChevronDownIcon />
                        </>
                      )}
                    </button>
                    <div
                      className={`${
                        isMenuOpen ? "" : "hidden lg:block"
                      } -mt-1 space-y-4`}
                    >
                      <h4 className="text-white">Add a transaction</h4>
                      <button
                        type="button"
                        className="w-full rounded bg-primary p-2 font-medium text-white hover:bg-red-500 focus:bg-red-500"
                        onClick={e => {
                          addNewField(
                            e,
                            push,
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
                            push,
                            "fa1.2-approve",
                            undefined,
                            Versioned.fa1_2_approve(props.contract)
                          );
                        }}
                      >
                        FA1.2 Approve
                      </button>
                      <button
                        type="button"
                        className="w-full rounded bg-primary p-2 font-medium text-white hover:bg-red-500 focus:bg-red-500"
                        onClick={e => {
                          addNewField(
                            e,
                            push,
                            "fa1.2-transfer",
                            undefined,
                            Versioned.fa1_2_transfer(props.contract)
                          );
                        }}
                      >
                        FA1.2 Transfer
                      </button>

                      <button
                        type="button"
                        className="w-full rounded bg-primary p-2 font-medium text-white hover:bg-red-500 focus:bg-red-500"
                        onClick={e => {
                          addNewField(
                            e,
                            push,
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
                            push,
                            "contract",
                            portalIdx.current,
                            Versioned.lambdaForm(props.contract)
                          );

                          portalIdx.current += 1;
                        }}
                      >
                        Contract Execution
                      </button>
                      {hasTzip27Support(props.contract.version) ? (
                        <button
                          type="button"
                          className="w-full rounded bg-primary p-2 font-medium text-white hover:bg-red-500 focus:bg-red-500"
                          onClick={e => {
                            addNewField(
                              e,
                              push,
                              "update_metadata",
                              portalIdx.current,
                              Versioned.update_metadata(props.contract.version)
                            );

                            portalIdx.current += 1;
                          }}
                        >
                          Update Metadata
                        </button>
                      ) : (
                        <div></div>
                      )}
                      {hasTzip27SupportWithPoEChallenge(
                        props.contract.version
                      ) ? (
                        <button
                          type="button"
                          className="w-full rounded bg-primary p-2 font-medium text-white hover:bg-red-500 focus:bg-red-500"
                          onClick={e => {
                            addNewField(
                              e,
                              push,
                              "poe",
                              portalIdx.current,
                              Versioned.poe(props.contract.version)
                            );

                            portalIdx.current += 1;
                          }}
                        >
                          Message Signing
                        </button>
                      ) : (
                        <div></div>
                      )}
                    </div>
                    <div
                      className={`${
                        isMenuOpen ? "" : "hidden lg:block"
                      } mt-4 h-px w-full bg-zinc-500`}
                    ></div>
                    <button
                      type="button"
                      className={`${
                        isMenuOpen ? "" : "hidden lg:block"
                      } mt-4 w-full rounded bg-primary p-2 font-medium text-white hover:bg-red-500 focus:bg-red-500`}
                      onClick={() => {
                        setFormState(initialProps);
                        form.resetForm({ values: initialProps });
                      }}
                    >
                      Remove all
                    </button>
                  </div>

                  <div className="mt-6 flex w-full flex-col-reverse space-y-6 space-y-reverse lg:mt-0 lg:w-4/5 lg:pr-8">
                    {values.transfers.length > 0 &&
                      values.transfers.map((transfer, index) => {
                        if (transfer.type === "contract") {
                          return (
                            <div
                              className="flex flex-col md:flex-row md:space-x-4"
                              key={(transfer as any).key.toString()}
                              id={(transfer as any).key.toString()}
                            >
                              <ExecuteContractForm
                                id={index}
                                defaultState={
                                  executeContractStateRef.current[index]
                                    ?.address === ""
                                    ? undefined
                                    : executeContractStateRef.current[index]
                                }
                                onChange={formState => {
                                  executeContractStateRef.current[index] =
                                    formState;
                                }}
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
                                onReset={() => {
                                  setFieldValue(
                                    `transfers.${index}.amount`,
                                    ""
                                  );
                                  setFieldValue(
                                    `transfers.${index}.walletAddress`,
                                    ""
                                  );
                                  setFieldValue(
                                    `transfers.${index}.values.lambda`,
                                    ""
                                  );
                                  setFieldValue(
                                    `transfers.${index}.values.metadata`,
                                    ""
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
                                  setFieldValue("walletAddress", "");
                                  remove(index);
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          );
                        } else if (transfer.type === "fa2") {
                          return (
                            <section key={`${transfer.type}:${index}`}>
                              <p className="text-lg text-white">
                                <span className="mr-2 text-zinc-500">
                                  #{(index + 1).toString().padStart(2, "0")}
                                </span>
                                FA2 token transfer
                              </p>
                              <FA2Transfer
                                key={index}
                                proposalIndex={index}
                                remove={remove}
                              />
                            </section>
                          );
                        } else if (transfer.type === "fa1.2-approve") {
                          return (
                            <section key={`${transfer.type}:${index}`}>
                              <p className="text-lg text-white">
                                <span className="mr-2 text-zinc-500">
                                  #{(index + 1).toString().padStart(2, "0")}
                                </span>
                                FA1.2 Approve
                              </p>
                              <FA1_2 key={index} index={index} remove={remove}>
                                {token => {
                                  const balance = !!token
                                    ? BigNumber(token.balance)
                                        .div(
                                          BigNumber(10).pow(
                                            token.token.metadata?.decimals ?? 0
                                          )
                                        )
                                        .toNumber()
                                    : undefined;

                                  return (
                                    <>
                                      <div className="w-full">
                                        <label className="text-white">
                                          Amount
                                        </label>
                                        <div className="relative w-full">
                                          <Field
                                            name={`transfers.${index}.values.amount`}
                                            validate={(x: string) => {
                                              if (!x) return "Value is empty";

                                              const amount = Number(x);

                                              if (isNaN(amount) || amount < 0) {
                                                return `Invalid amount ${x}`;
                                              }

                                              if (!balance) return;

                                              if (amount > balance) {
                                                return `You only have ${balance} token${
                                                  balance <= 1 ? "" : "s"
                                                }`;
                                              }
                                            }}
                                          >
                                            {({ field }: FieldProps) => (
                                              <>
                                                <input
                                                  {...field}
                                                  className="xl:text-md relative h-fit min-h-fit w-full rounded p-2 text-sm xl:w-full"
                                                  placeholder="1"
                                                />
                                                {!!balance && !field.value && (
                                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                                                    Max:{" "}
                                                    {balance > 1000
                                                      ? "1000+"
                                                      : balance}
                                                  </span>
                                                )}
                                              </>
                                            )}
                                          </Field>
                                        </div>

                                        <ErrorMessage
                                          name={`transfers.${index}.values.amount`}
                                        />
                                      </div>
                                      <div>
                                        <label className="text-white">
                                          Spender
                                        </label>
                                        <Field
                                          className="xl:text-md relative h-fit min-h-fit w-full rounded p-2 text-sm"
                                          name={`transfers.${index}.values.spenderAddress`}
                                          placeholder="Destination address"
                                          validate={(x: string) =>
                                            validateAddress(x) !==
                                            ValidationResult.VALID
                                              ? `Invalid address ${x ?? ""}`
                                              : undefined
                                          }
                                        />
                                        <ErrorMessage
                                          name={`transfers.${index}.values.spenderAddress`}
                                        />
                                      </div>
                                    </>
                                  );
                                }}
                              </FA1_2>
                            </section>
                          );
                        } else if (transfer.type === "fa1.2-transfer") {
                          return (
                            <section key={`${transfer.type}:${index}`}>
                              <p className="text-lg text-white">
                                <span className="mr-2 text-zinc-500">
                                  #{(index + 1).toString().padStart(2, "0")}
                                </span>
                                FA1.2 Transfer
                              </p>
                              <FA1_2 key={index} index={index} remove={remove}>
                                {token => {
                                  const balance = !!token
                                    ? BigNumber(token.balance)
                                        .div(
                                          BigNumber(10).pow(
                                            token.token.metadata?.decimals ?? 0
                                          )
                                        )
                                        .toNumber()
                                    : undefined;

                                  return (
                                    <>
                                      <div className="w-full">
                                        <label className="text-white">
                                          Amount
                                        </label>
                                        <div className="relative w-full">
                                          <Field
                                            name={`transfers.${index}.values.amount`}
                                            validate={(x: string) => {
                                              if (!x) return "Value is empty";

                                              const amount = Number(x);

                                              if (
                                                isNaN(amount) ||
                                                amount <= 0
                                              ) {
                                                return `Invalid amount ${x}`;
                                              }

                                              if (!balance) return;

                                              if (amount > balance) {
                                                return `You only have ${balance} token${
                                                  balance <= 1 ? "" : "s"
                                                }`;
                                              }
                                            }}
                                          >
                                            {({ field }: FieldProps) => (
                                              <>
                                                <input
                                                  {...field}
                                                  className="xl:text-md relative h-fit min-h-fit w-full rounded p-2 text-sm xl:w-full"
                                                  placeholder="1"
                                                />
                                                {!!balance && !field.value && (
                                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                                                    Max:{" "}
                                                    {balance > 1000
                                                      ? "1000+"
                                                      : balance}
                                                  </span>
                                                )}
                                              </>
                                            )}
                                          </Field>
                                        </div>

                                        <ErrorMessage
                                          name={`transfers.${index}.values.amount`}
                                        />
                                      </div>
                                      <div>
                                        <label className="text-white">
                                          Transfer to
                                        </label>
                                        <Field
                                          className="xl:text-md relative h-fit min-h-fit w-full rounded p-2 text-sm"
                                          name={`transfers.${index}.values.targetAddress`}
                                          placeholder="Destination address"
                                          validate={(x: string) =>
                                            validateAddress(x) !==
                                            ValidationResult.VALID
                                              ? `Invalid address ${x ?? ""}`
                                              : undefined
                                          }
                                        />
                                        <ErrorMessage
                                          name={`transfers.${index}.values.targetAddress`}
                                        />
                                      </div>
                                    </>
                                  );
                                }}
                              </FA1_2>
                            </section>
                          );
                        } else if (transfer.type === "poe") {
                          return (
                            <section key={`${transfer.type}:${index}`}>
                              <p className="text-lg text-white">
                                <span className="mr-2 text-zinc-500">
                                  #{(index + 1).toString().padStart(2, "0")}
                                </span>
                                Message signing in Proof of Event Challenge{" "}
                                {" (TZIP27)"}
                              </p>

                              <div
                                className={
                                  "md:p-none flex h-fit min-h-fit min-w-full flex-1 flex-col items-start justify-around space-y-4 md:flex-row md:space-x-4  md:space-y-0 md:rounded-none md:border-none"
                                }
                                key={index}
                              >
                                {transfer.fields.map((value, idx, arr) => {
                                  let classn = `${
                                    (idx + 1) % 2 === 0
                                      ? `relative flex flex-col justify-start`
                                      : "flex flex-col"
                                  }`;

                                  return (
                                    <div
                                      className={`${classn} w-full flex-1 md:w-auto`}
                                      key={idx}
                                    >
                                      <label className="mb-1 text-white">
                                        {value.label}
                                      </label>
                                      <Field
                                        component={value.kind}
                                        name={`transfers.${index}.values.${value.field}`}
                                        className={
                                          "md:text-md relative h-fit min-h-fit w-full flex-1 rounded p-2 text-sm md:w-auto"
                                        }
                                        placeholder={value.placeholder}
                                        rows={10}
                                        validate={value.validate}
                                      />

                                      <ErrorMessage
                                        name={`transfers.${index}.values.${value.field}`}
                                      />
                                      {!hasTzip27SupportWithPoEChallenge(
                                        props.contract.version
                                      ) &&
                                        renderWarning(
                                          "This version doesn't support message signing, and it will be removed following submission."
                                        )}
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
                                })}
                              </div>
                            </section>
                          );
                        } else if (transfer.type === "update_metadata") {
                          return (
                            <section key={`${transfer.type}:${index}`}>
                              <p className="text-lg text-white">
                                <span className="mr-2 text-zinc-500">
                                  #{(index + 1).toString().padStart(2, "0")}
                                </span>
                                Update Metadata {" (TZIP16)"}
                              </p>

                              <div
                                className={
                                  "md:p-none flex h-fit min-h-fit min-w-full flex-1 flex-col items-start justify-around space-y-4 md:flex-row md:space-x-4  md:space-y-0 md:rounded-none md:border-none"
                                }
                                key={index}
                              >
                                {transfer.fields.map((value, idx, arr) => {
                                  let classn = `${
                                    (idx + 1) % 2 === 0
                                      ? `relative flex flex-col justify-start`
                                      : "flex flex-col"
                                  }`;

                                  return (
                                    <div
                                      className={`${classn} w-full flex-1 md:w-auto`}
                                      key={idx}
                                    >
                                      <label className="mb-1 text-white">
                                        {value.label}
                                      </label>
                                      <Field
                                        component={value.kind}
                                        name={`transfers.${index}.values.${value.field}`}
                                        className={
                                          "md:text-md relative h-fit min-h-fit w-full flex-1 rounded p-2 text-sm md:w-auto"
                                        }
                                        placeholder={value.placeholder}
                                        rows={10}
                                        validate={value.validate}
                                      />

                                      <ErrorMessage
                                        name={`transfers.${index}.values.${value.field}`}
                                      />
                                      {!hasTzip27Support(
                                        props.contract.version
                                      ) &&
                                        renderWarning(
                                          "This version doesn't support metadata updateing, and it will be removed following submission."
                                        )}
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
                                })}
                              </div>
                            </section>
                          );
                        }
                        if (!("fields" in transfer)) return;

                        const withTextArea = transfer.fields.find(
                          x => x?.kind === "textarea"
                        )
                          ? " flex-col md:flex-col"
                          : "";

                        return (
                          <section key={`${transfer.type}:${index}`}>
                            <p className="text-lg text-white">
                              <span className="mr-2 text-zinc-500">
                                #{(index + 1).toString().padStart(2, "0")}
                              </span>
                              {!transfer.fields.find(v => v.kind === "textarea")
                                ? "Transfer"
                                : "Execute lambda"}
                            </p>
                            <div
                              className={
                                withTextArea +
                                "md:p-none flex h-fit min-h-fit min-w-full flex-col items-start justify-around space-y-4 md:flex-row md:space-x-4 md:space-y-0  md:rounded-none md:border-none"
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
                                  (value.kind === "input-complete" ||
                                    value.kind === "autocomplete")
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
                                    />
                                  </div>
                                );
                              })}
                              <div>
                                <label className="text-transparent">
                                  Helper
                                </label>
                                <button
                                  type="button"
                                  className={
                                    (errors.transfers && errors.transfers[index]
                                      ? "my-auto"
                                      : "") +
                                    " mx-none mt-4 block self-center justify-self-end rounded bg-primary p-1.5 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500 md:mx-auto md:mt-1 md:self-end"
                                  }
                                  onClick={e => {
                                    e.preventDefault();

                                    remove(index);
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </section>
                        );
                      })}

                    {
                      <div className="order-first flex flex-col justify-around pt-8">
                        {values.transfers.length > 0 && (
                          <>
                            <div className="md-2 flex w-full items-center space-x-4">
                              <label className="font-medium text-white">
                                Sign immediately:
                              </label>
                              <Field
                                name="signImmediatelyFlag"
                                type="checkbox"
                                onChange={(
                                  e: ChangeEvent<HTMLInputElement>
                                ) => {
                                  if (!e.target.checked) {
                                    setFieldValue(
                                      "resolveImmediatelyFlag",
                                      e.target.checked
                                    );
                                  }
                                  setFieldValue(
                                    "signImmediatelyFlag",
                                    e.target.checked
                                  );
                                }}
                                className="h-4 w-4 rounded-md p-2"
                              />
                              <ErrorMessage name="signImmediatelyFlag" />
                            </div>

                            {state.currentContract &&
                              state.contracts[
                                state.currentContract
                              ]?.threshold.toNumber() <= 1 && (
                                <div className="md-2 flex w-full items-center space-x-4">
                                  <label className="font-medium text-white">
                                    Resolve immediately:
                                  </label>
                                  <Field
                                    disabled={!values.signImmediatelyFlag}
                                    name="resolveImmediatelyFlag"
                                    type="checkbox"
                                    className="h-4 w-4 rounded-md p-2"
                                  />
                                  <ErrorMessage name="resolveImmediatelyFlag" />
                                </div>
                              )}

                            <button
                              className="mt-8 rounded bg-primary p-2 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500 md:mx-auto"
                              type="submit"
                            >
                              Submit
                            </button>
                          </>
                        )}
                      </div>
                    }
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
