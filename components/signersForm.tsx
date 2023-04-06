import { NetworkType } from "@airgap/beacon-sdk";
import { validateAddress } from "@taquito/utils";
import {
  ErrorMessage,
  Field,
  FieldArray,
  Form,
  Formik,
  FormikErrors,
} from "formik";
import { useRouter } from "next/router";
import { FC, useContext, useEffect, useMemo, useState } from "react";
import { MODAL_TIMEOUT, PREFERED_NETWORK } from "../context/config";
import {
  AppDispatchContext,
  AppStateContext,
  contractStorage,
} from "../context/state";
import {
  durationOfDaysHoursMinutes,
  secondsToDuration,
} from "../utils/adaptiveTime";
import { signers, VersionedApi } from "../versioned/apis";
import { ownersForm } from "../versioned/forms";
import ContractLoader from "./contractLoader";
import renderError from "./renderError";

function get(
  s: string | FormikErrors<{ name: string; address: string }>
): boolean {
  if (typeof s == "string") {
    return false;
  } else {
    if (s.address) {
      return s.address.length !== 0;
    } else {
      return false;
    }
  }
}

const SignersForm: FC<{
  closeModal: () => void;
  address: string;
  contract: contractStorage;
  disabled?: boolean;
}> = props => {
  const state = useContext(AppStateContext)!;
  const dispatch = useContext(AppDispatchContext)!;
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [timeoutAndHash, setTimeoutAndHash] = useState([false, ""]);
  const [result, setResult] = useState<undefined | boolean>(undefined);

  const duration = useMemo(() => {
    if (
      ["0.0.6", "0.0.8", "0.0.9", "unknown version"].includes(
        props.contract.version
      )
    )
      return undefined;

    return secondsToDuration(props.contract.effective_period).toObject();
  }, [props.contract]);

  useEffect(() => {
    if (loading || result === undefined) return;

    setTimeout(() => {
      setResult(undefined);
    }, MODAL_TIMEOUT);
  }, [result, loading]);

  const initialProps: {
    validators: { name: string; address: string }[];
    requiredSignatures: number;
    days: string | undefined;
    hours: string | undefined;
    minutes: string | undefined;
    validatorsError?: string;
  } = {
    validators: signers(props.contract).map(x => ({
      address: x,
      name: state.aliases[x] || "",
    })),
    days: duration?.days?.toString(),
    hours: duration?.hours?.toString(),
    minutes: duration?.minutes?.toString(),
    requiredSignatures: props.contract.threshold,
  };

  function getOps(
    txs: { name: string; address: string }[],
    requiredSignatures: number,
    effectivePeriod: number | undefined
  ) {
    let initialSigners = new Set(signers(props.contract));
    let input = new Set(txs.map(x => x.address));
    let removed = new Set(
      [...initialSigners.values()].filter(x => !input.has(x))
    );
    let added = new Set(
      [...input.values()].filter(x => !initialSigners.has(x))
    );
    let ops: ownersForm[] = [];

    if (
      !!effectivePeriod &&
      Number(effectivePeriod) !=
        (props.contract.effective_period.toNumber?.() ??
          Number(props.contract.effective_period))
    ) {
      ops.push({ adjustEffectivePeriod: Number(effectivePeriod) });
    }
    if (added.size > 0) {
      ops.push({ addOwners: [...added.values()] });
    }
    if (removed.size > 0) {
      ops.push({ removeOwners: [...removed.values()] });
    }
    if (props.contract.threshold !== requiredSignatures) {
      ops.push({ changeThreshold: requiredSignatures });
    }

    return ops;
  }

  const updateSettings = async (ops: ownersForm[]) => {
    let cc = await state.connection.contract.at(props.address);
    let api = VersionedApi(props.contract.version, props.address);
    setTimeoutAndHash(
      await api.submitSettingsProposals(cc, state.connection, ops)
    );
  };

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
        <div></div>
        <div className="mt-8 w-full space-x-4">
          <button
            className="rounded border-2 bg-transparent px-4 py-2 font-medium text-white hover:outline-none"
            onClick={() => {
              setResult(undefined);
              setTimeoutAndHash([false, ""]);
            }}
          >
            Back to settings
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
        </ContractLoader>
      </div>
    );
  }
  return (
    <Formik
      enableReinitialize={true}
      initialValues={initialProps}
      validate={values => {
        const errors: {
          validators: { address: string; name: string }[];
          requiredSignatures?: any;
          validatorsError?: string;
          days?: string;
          hours?: string;
          minutes?: string;
          proposalDuration?: string;
        } = { validators: [] };
        let dedup = new Set();
        let dedupName = new Set();
        if (values.validators.length < 1) {
          errors.validatorsError = "Should be at least one owner";
        }
        let result = values.validators.map(x => {
          let err = { address: "", name: "" };
          if (dedup.has(x.address)) {
            err.address = "already exists";
          } else {
            dedup.add(x.address);
            err.address =
              validateAddress(x.address) !== 3
                ? `invalid address ${x.address}`
                : "";
          }
          if (!!x.name && dedupName.has(x.name)) {
            err.name = "already exists";
          } else {
            dedupName.add(x.name);
          }
          return err;
        });
        errors.validators = result;
        if (values.requiredSignatures > values.validators.length) {
          errors.requiredSignatures = `threshold too high. required number of signatures: ${values.requiredSignatures}, total amount of signers: ${values.validators.length}`;
        }

        const parsedDays = Number(values.days);
        if (
          !!values.days &&
          (isNaN(parsedDays) ||
            !Number.isInteger(parsedDays) ||
            parsedDays <= 0)
        ) {
          errors.days = "Invalid days";
        }

        const parsedHours = Number(values.hours);
        if (
          !!values.hours &&
          (isNaN(parsedHours) ||
            !Number.isInteger(parsedHours) ||
            parsedHours <= 0)
        ) {
          errors.hours = "Invalid hours";
        }

        const parsedMinutes = Number(values.minutes);
        if (
          !!values.minutes &&
          (isNaN(parsedMinutes) ||
            !Number.isInteger(parsedMinutes) ||
            parsedMinutes <= 0)
        ) {
          errors.minutes = "Invalid minutes";
        }

        if (!values.days && !values.hours && !values.minutes) {
          errors.proposalDuration = "Please fill at least one field";
        }

        if (Object.values(errors).length > 1) return errors;

        if (
          result.every(x => x.address === "" && x.name === "") &&
          !errors.requiredSignatures &&
          !errors.validatorsError
        ) {
          return;
        }

        return errors;
      }}
      onSubmit={async values => {
        if (!!props.disabled) return;

        setLoading(true);
        try {
          await updateSettings(
            getOps(
              values.validators,
              values.requiredSignatures,
              Math.ceil(
                durationOfDaysHoursMinutes(
                  values.days,
                  values.hours,
                  values.minutes
                ).toMillis() / 1000
              )
            )
          );
          setResult(true);
          dispatch!({
            type: "updateAliases",
            payload: { aliases: values.validators, keepOld: true },
          });
        } catch (e) {
          console.log(e);
          setResult(false);
        }
        setLoading(false);
        setTimeout(() => {
          props.closeModal();
        }, MODAL_TIMEOUT);
      }}
    >
      {({
        values,
        errors,
        setFieldTouched,
        setFieldValue,
        setTouched,
        validateForm,
      }) => {
        console.log(
          getOps(
            values.validators,
            values.requiredSignatures,
            Math.ceil(
              durationOfDaysHoursMinutes(
                values.days,
                values.hours,
                values.minutes
              ).toMillis() / 1000
            )
          ),
          errors
        );

        const hasNoChange =
          getOps(
            values.validators,
            values.requiredSignatures,
            Math.ceil(
              durationOfDaysHoursMinutes(
                values.days,
                values.hours,
                values.minutes
              ).toMillis() / 1000
            )
          ).length === 0;

        return (
          <Form className="align-self-center flex h-full w-full grow flex-col items-center justify-center justify-self-center">
            <div className="mb-2 self-center text-2xl font-medium text-white">
              Change wallet participants below
            </div>
            <ErrorMessage name={`validatorsError`} render={renderError} />
            <div className="mb-2 grid w-full grid-flow-row items-start gap-4">
              <FieldArray name="validators">
                {({ remove, push }) => (
                  <div className="min-w-full space-y-6">
                    {values.validators.length > 0 &&
                      values.validators.map((validator, index) => {
                        return (
                          <div
                            className="md:p-none flex min-w-full flex-col items-start justify-start space-y-4 md:flex-row md:space-y-0 md:space-x-4"
                            key={index}
                          >
                            <div className="flex w-full flex-col md:w-auto">
                              <label className="text-white">
                                <span className="md:hidden">Owner name</span>
                                {index === 0 ? "Owner Name" : ""}
                              </label>
                              <Field
                                disabled={props.disabled}
                                name={`validators.${index}.name`}
                                className="md:text-md rounded p-2 text-sm"
                                placeholder={validator.name || "Owner Name"}
                              />
                              <ErrorMessage
                                name={`validators.${index}.name`}
                                render={renderError}
                              />
                            </div>
                            <div className="relative flex w-full flex-col justify-start md:w-auto md:grow">
                              <label
                                className="text-white"
                                htmlFor={`validators.${index}.address`}
                              >
                                <span className="md:hidden">Owner address</span>
                                {index === 0 ? "Owner Address" : ""}
                              </label>
                              <Field
                                disabled={props.disabled}
                                name={`validators.${index}.address`}
                                className="md:text-md w-full rounded p-2 text-sm"
                                placeholder={
                                  validator.address || "Owner address"
                                }
                                default={validator.address}
                              />
                              <ErrorMessage
                                name={`validators.${index}.address`}
                                render={x => {
                                  return renderError(x);
                                }}
                              />
                            </div>
                            <button
                              type="button"
                              className={
                                (errors.validators &&
                                errors.validators[index] &&
                                get(errors.validators[index])
                                  ? "my-auto"
                                  : "") +
                                `mx-none block self-center justify-self-end rounded bg-primary p-1.5 font-medium text-white md:mx-auto ${
                                  index === 0 ? "md:self-end" : "md:self-start"
                                } ${
                                  props.disabled ?? false
                                    ? "pointer-events-none opacity-50"
                                    : ""
                                }`
                              }
                              onClick={e => {
                                e.preventDefault();
                                remove(index);
                                setTouched({ validatorsError: true }, true);
                                validateForm();
                                if (
                                  values.requiredSignatures >
                                  values.validators.length
                                ) {
                                  setFieldTouched("requiredSignatures", true);
                                  values.requiredSignatures >= 2 &&
                                    setFieldValue(
                                      "requiredSignatures",
                                      values.requiredSignatures - 1
                                    );
                                }
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })}
                    <button
                      type="button"
                      className={`${
                        props.disabled ?? false
                          ? "pointer-events-none opacity-50"
                          : ""
                      } my-2 mx-auto block self-center justify-self-center rounded bg-primary p-2 font-medium text-white`}
                      onClick={e => {
                        e.preventDefault();
                        push({ name: "", address: "" });
                      }}
                    >
                      Add Owner
                    </button>
                  </div>
                )}
              </FieldArray>
            </div>
            <div className="mt-4 flex w-full flex-col md:grow">
              <label className="mr-4 text-white">Threshold </label>
              <Field
                disabled={props.disabled}
                className="mt-2 w-full rounded p-2 text-center"
                as="select"
                component="select"
                name="requiredSignatures"
                values={values.requiredSignatures}
              >
                {[
                  ...Array(
                    Math.max(
                      values.requiredSignatures,
                      values.validators.length
                    )
                  ).keys(),
                ].map(idx => (
                  <option
                    key={idx + values.validators.length}
                    label={`${idx + 1}/${values.validators.length}`}
                    value={idx + 1}
                  ></option>
                ))}
              </Field>
              <ErrorMessage name={`requiredSignatures`} render={renderError} />
            </div>

            <div className="mt-4 w-full">
              <h3 className="text-lg text-white">Proposal duration</h3>
              <div className="md:p-none mt-2 flex min-w-full flex-col items-start justify-start space-y-4 md:flex-row md:space-y-0 md:space-x-4">
                <div className="flex w-full grow flex-col md:w-auto">
                  <label className="text-white">Days</label>
                  <Field
                    disabled={props.disabled}
                    name="days"
                    className="md:text-md mt-1 rounded p-2 text-sm"
                    placeholder="0"
                  />
                  <ErrorMessage name="days" render={renderError} />
                </div>
                <div className="flex w-full grow flex-col md:w-auto">
                  <label className="text-white">Hours</label>
                  <Field
                    disabled={props.disabled}
                    name="hours"
                    className="md:text-md mt-1 rounded p-2 text-sm"
                    placeholder="0"
                  />
                  <ErrorMessage name="hours" render={renderError} />
                </div>
                <div className="flex w-full grow flex-col md:w-auto">
                  <label className="text-white">Minutes</label>
                  <Field
                    disabled={props.disabled}
                    name="minutes"
                    className="md:text-md mt-1 rounded p-2 text-sm"
                    placeholder="0"
                  />
                  <ErrorMessage name="minutes" render={renderError} />
                </div>
              </div>
              {/* @ts-ignore*/}
              {!!errors.proposalDuration &&
                // @ts-ignore
                renderError(errors.proposalDuration)}
            </div>

            <div className="mt-6 flex w-full justify-center">
              <button
                className={`${
                  (props.disabled ?? false) ||
                  hasNoChange ||
                  Object.values(errors).find(v => !!v)
                    ? "pointer-events-none opacity-50"
                    : ""
                } my-2 rounded bg-primary p-2 font-medium text-white hover:bg-red-500`}
                type="submit"
              >
                Save changes
              </button>
            </div>
          </Form>
        );
      }}
    </Formik>
  );
};

export default SignersForm;
