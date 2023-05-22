import { NetworkType } from "@airgap/beacon-sdk";
import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import { validateContractAddress, ValidationResult } from "@taquito/utils";
import {
  ErrorMessage,
  Field,
  FieldArray,
  FieldProps,
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
import { MODAL_TIMEOUT, PREFERED_NETWORK } from "../context/config";
import { AppStateContext, contractStorage } from "../context/state";
import { mutezToTez, tezToMutez } from "../utils/tez";
import { debounce } from "../utils/timeout";
import { VersionedApi } from "../versioned/apis";
import { Versioned, proposals } from "../versioned/interface";
import Alias from "./Alias";
import ExecuteForm from "./ContractExecution";
import FA1_2 from "./FA1_2";
import FA2Transfer from "./FA2Transfer";
import Spinner from "./Spinner";
import ContractLoader from "./contractLoader";
import renderError from "./formUtils";
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
  onAmountChange?: (value: number) => any;
  onAddressChange?: (value: string) => any;
  address?: string;
}>) {
  const { getFieldProps } = useFormikContext();

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

  const validate = async (newState: typeof localFormState) => {
    const newErrors: typeof errors = {
      amount: undefined,
      address: undefined,
    };

    if (!newState.address) {
      newErrors.address = "Address can't be empty";
    }

    if (
      !!newState.address &&
      validateContractAddress(newState.address.trim()) !==
        ValidationResult.VALID
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

    if (newState.address !== "" && !exists && !newErrors.address) {
      newErrors.address = `Contract does not exist at address ${newState.address}`;
    }

    if (!!address) {
      newErrors.address = undefined;
    }

    if (isNaN(newState.amount ?? NaN) || (newState.amount ?? -1) < 0) {
      newErrors.amount =
        newState.amount === undefined
          ? ""
          : "Invalid amount " + newState.amount;
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

    setLocalFormState(newState);

    return !!errors.address || !!errors.amount;
  };

  return (
    <div className="align-self-center col-span-1 flex w-full flex-col items-center justify-center justify-self-center">
      <div className="flex w-full flex-col justify-center space-y-2 space-x-0 md:flex-row md:space-x-4 md:space-y-0">
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
                    onOwnChange={(address: string) =>
                      debounce(async () => {
                        setContractLoading(true);
                        await validateAndSetState({
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
                    name={`transfers.${id}.walletAddress`}
                    className=" w-full p-2 text-black"
                    placeholder={"contract address"}
                    rows={10}
                    validate={async address => {
                      const hasError = await validateAndSetState({
                        ...localFormState,
                        address,
                      });

                      // The returned value doesn't matter
                      // Having one allows to prevent Formik to submit the form
                      return hasError ? "ohno" : undefined;
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
          {!!errors.address && renderError(errors.address)}
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
                    const amount = Number(e.target.value.trim());
                    const hasError = await validateAndSetState({
                      ...localFormState,
                      amount,
                    });

                    if (hasError) return;

                    onAmountChange?.(tezToMutez(amount));
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
            const address = getFieldProps(
              `transfers.${id}.walletAddress`
            ).value;

            let toValidate = localFormState;

            if (!!address && !localFormState.address) {
              toValidate = { ...localFormState, address };
              setLocalFormState(toValidate);
            }

            const errors = await validate(toValidate);

            if (!!errors.amount || !!errors.address) return;
            onAddressChange?.(toValidate.address);
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
    getFieldProps: () => string;
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
      <div className="mt-8 mb-2 flex w-full items-center justify-center rounded border-2 border-white p-4 align-middle">
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
          setState({ ...state, amount });
        }}
        onAddressChange={address => {
          setState({ ...state, address });
          setFieldValue(
            `transfers.${props.id}.amount`,
            !!state.amount ? mutezToTez(state.amount) : undefined
          );
        }}
        withContinue={!state.address}
        address={state.address}
        defaultValues={{
          amount: state.amount,
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

const initialProps: proposals = {
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
              PREFERED_NETWORK === NetworkType.GHOSTNET ? "ghostnet." : ""
            }tzkt.io/${timeoutAndHash[1]}`}
            target="_blank"
            rel="noreferrer"
          >
            the explorer
          </a>
          , and if it is, {"it'll"} appear in the proposals
        </p>
        <div className="mt-8 w-full space-y-4 md:space-y-0 md:space-x-4">
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
      {({ values, errors, setFieldValue, getFieldProps, getFieldHelpers }) => (
        <Form className="align-self-center col-span-2 flex w-full grow flex-col items-center justify-center justify-self-center">
          <div className="relative mb-2 grid w-full grid-flow-row items-start gap-4">
            <FieldArray name="transfers">
              {({ remove, replace, unshift, push, form }) => (
                <div
                  className="flex h-fit min-w-full flex-col lg:flex-row-reverse"
                  id="top"
                >
                  <div
                    className={`sticky z-[5] ${
                      state.hasBanner ? "top-36" : "top-24"
                    } ${
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
                      } -mt-1 flex w-full items-center py-2 px-6 text-white lg:hidden`}
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
                            "fa1.2_transfer",
                            undefined,
                            Versioned.fa2(props.contract)
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
                            "fa1.2_approve",
                            undefined,
                            Versioned.fa2(props.contract)
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
                                setFieldValue={setFieldValue}
                                getFieldProps={getFieldProps}
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
                              <FA1_2
                                key={index}
                                index={index}
                                setFieldValue={setFieldValue}
                                getFieldProps={getFieldProps}
                                remove={remove}
                              >
                                <span></span>
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
                              <FA1_2
                                key={index}
                                index={index}
                                setFieldValue={setFieldValue}
                                getFieldProps={getFieldProps}
                                remove={remove}
                              >
                                <span></span>
                              </FA1_2>
                            </section>
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
                    <div className="order-first mb-auto flex flex-row justify-around md:mx-auto md:w-1/3">
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
