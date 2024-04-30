import { NetworkType } from "@airgap/beacon-sdk";
import { Parser } from "@taquito/michel-codec";
import { validateAddress, ValidationResult, char2Bytes } from "@taquito/utils";
import {
  ErrorMessage,
  Field,
  FieldArray,
  Form,
  Formik,
  FormikErrors,
} from "formik";
import { useRouter } from "next/router";
import { FC, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAliases } from "../context/aliases";
import {
  MODAL_TIMEOUT,
  PREFERED_NETWORK,
  PROPOSAL_DURATION_WARNING,
} from "../context/config";
import { TZKT_API_URL } from "../context/config";
import { useContracts } from "../context/contracts";
import {
  generateDelegateMichelson,
  generateUndelegateMichelson,
} from "../context/generateLambda";
import { useAppDispatch, useAppState } from "../context/state";
import { TezosToolkitContext } from "../context/tezos-toolkit";
import { useWallet } from "../context/wallet";
import useCurrentContract from "../hooks/useCurrentContract";
import { ContractStorage } from "../types/app";
import {
  durationOfDaysHoursMinutes,
  parseIntOr,
  secondsToDuration,
} from "../utils/adaptiveTime";
import { signers, VersionedApi } from "../versioned/apis";
import { ownersForm } from "../versioned/forms";
import ContractLoader from "./contractLoader";
import renderError, { renderWarning } from "./formUtils";

const parser = new Parser();

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

// This components only allows to fetch the delegator
// And update the form data
const DelegatorHelper = ({
  address,
  setFieldValue,
  bakerAddressRef,
}: {
  address: string | null;
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
  bakerAddressRef: React.MutableRefObject<null | string>;
}) => {
  const { tezos } = useContext(TezosToolkitContext);

  useEffect(() => {
    if (!address) return;

    tezos.tz
      .getDelegate(address)
      .then(bakerAddress => {
        bakerAddressRef.current = bakerAddress;
        setFieldValue("bakerAddress", bakerAddress);
      })
      .catch(() => {
        setFieldValue("bakerAddress", undefined);
      });
  }, []);

  return null;
};

const SignersForm: FC<{
  closeModal: () => void;
  address: string;
  contract: ContractStorage | undefined;
  disabled?: boolean;
}> = props => {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { userAddress } = useWallet();
  const { updateAliases, addressBook } = useAliases();
  const { tezos } = useContext(TezosToolkitContext);
  const router = useRouter();
  const bakerAddressRef = useRef<null | string>(null);
  const { contracts } = useContracts();
  const currentContract = useCurrentContract();

  const [loading, setLoading] = useState(false);
  const [timeoutAndHash, setTimeoutAndHash] = useState([false, ""]);
  const [result, setResult] = useState<undefined | boolean>(undefined);

  const duration = useMemo(() => {
    if (
      ["0.0.6", "0.0.8", "0.0.9", "unknown version"].includes(
        props.contract?.version ?? "unknown version"
      )
    )
      return undefined;

    return secondsToDuration(
      Number(props.contract?.effective_period ?? 0)
    ).toObject();
  }, [props.contract]);

  useEffect(() => {
    if (loading || result === undefined) return;

    setTimeout(() => {
      setResult(undefined);
    }, MODAL_TIMEOUT);
  }, [result, loading]);

  useEffect(() => {
    if (!!state.delegatorAddresses) return;

    fetch(`${TZKT_API_URL}/v1/delegates?select.values=address`)
      .then(res => res.json())
      .then(payload => dispatch({ type: "setDelegatorAddresses", payload }));
  }, [state.delegatorAddresses]);

  const initialProps: {
    validators: { name: string; address: string }[];
    requiredSignatures: number;
    days: string | undefined;
    hours: string | undefined;
    minutes: string | undefined;
    validatorsError?: string;
    bakerAddress: string | undefined;
  } = {
    validators: (!props.contract
      ? []
      : "owners" in props.contract
      ? props.contract.owners
      : signers(props.contract)
    ).map((x: string) => ({
      address: x,
      name: addressBook[x] || "",
    })),
    days: duration?.days?.toString(),
    hours: duration?.hours?.toString(),
    minutes: duration?.minutes?.toString(),
    requiredSignatures: !props.contract
      ? 0
      : (props.contract as ContractStorage).threshold.toNumber(),
    bakerAddress: undefined,
  };

  function getOps(
    txs: { name: string; address: string }[],
    requiredSignatures: number,
    effectivePeriod: number | undefined,
    {
      bakerAddress,
      oldBakerAddress,
    }: { bakerAddress: string | undefined; oldBakerAddress: string | undefined }
  ) {
    if (!props.contract) return [];

    const version =
      contracts[currentContract ?? ""]?.version ??
      state.currentStorage?.version;

    const initialSigners = new Set<string>(
      "owners" in props.contract
        ? props.contract.owners
        : signers(props.contract)
    );
    const input = new Set(txs.map(x => x.address));
    const removed = new Set(
      [...initialSigners.values()].filter(x => !input.has(x))
    );
    const added = new Set(
      [...input.values()].filter(x => !initialSigners.has(x))
    );
    const ops: ownersForm[] = [];

    if (
      !!effectivePeriod &&
      Number(effectivePeriod) != Number(props.contract?.effective_period ?? 0)
    ) {
      ops.push({ adjustEffectivePeriod: Number(effectivePeriod) });
    }
    if (added.size > 0) {
      ops.push({ addOwners: [...added.values()] });
    }
    if (removed.size > 0) {
      ops.push({ removeOwners: [...removed.values()] });
    }
    if (props.contract.threshold.toNumber() !== requiredSignatures) {
      ops.push({ changeThreshold: requiredSignatures });
    }
    if (!!bakerAddress && bakerAddress !== oldBakerAddress) {
      const lambda = parser.parseMichelineExpression(
        generateDelegateMichelson(version, { bakerAddress })
      );
      ops.push({
        execute_lambda: {
          metadata: char2Bytes(
            JSON.stringify({
              baker_address: bakerAddress,
            })
          ),
          lambda,
        },
      });
    } else if (bakerAddress === "" && !!oldBakerAddress) {
      const lambda = parser.parseMichelineExpression(
        generateUndelegateMichelson(version)
      );

      ops.push({
        execute_lambda: {
          metadata: char2Bytes(
            JSON.stringify({
              old_baker_address: oldBakerAddress,
            })
          ),
          lambda,
        },
      });
    }

    return ops;
  }

  const updateSettings = async (ops: ownersForm[]) => {
    if (!props.contract) return;

    let cc = await tezos.wallet.at(props.address);
    let api = VersionedApi(props.contract.version, props.address);
    setTimeoutAndHash(await api.submitSettingsProposals(cc, tezos, ops));
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
        <div></div>
        <div className="mt-8 w-full space-y-4 md:space-x-4 md:space-y-0">
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
              router.push(`/${currentContract}/proposals`);
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

  const getOpsHelper = (values: typeof initialProps) =>
    getOps(
      values.validators,
      values.requiredSignatures,
      Math.ceil(
        durationOfDaysHoursMinutes(
          values.days,
          values.hours,
          values.minutes
        ).toMillis() / 1000
      ),
      // If it's the same value it means there's no change so we ignore it
      // The other check is the same but checks for the null & empty string case
      {
        bakerAddress:
          bakerAddressRef.current === values.bakerAddress ||
          (!bakerAddressRef.current && !values.bakerAddress)
            ? undefined
            : values.bakerAddress,
        oldBakerAddress: bakerAddressRef.current ?? undefined,
      }
    );

  return (
    <Formik
      enableReinitialize={true}
      initialValues={initialProps}
      validate={async values => {
        const errors: {
          validators: { address: string; name: string }[];
          requiredSignatures?: any;
          validatorsError?: string;
          days?: string;
          hours?: string;
          minutes?: string;
          proposalDuration?: string;
          bakerAddress?: string;
        } = { validators: [] };
        let dedup = new Set();
        let dedupName = new Set();
        if (values.validators.length < 1) {
          errors.validatorsError = "Should be at least one owner";
        }
        let result = values.validators.map(x => {
          let err = { address: "", name: "" };
          if (dedup.has(x.address)) {
            err.address = "Please enter each account only once";
          } else {
            dedup.add(x.address);
            err.address =
              validateAddress(x.address) !== ValidationResult.VALID
                ? `Invalid address ${x.address}`
                : "";
          }
          if (!!x.name && dedupName.has(x.name)) {
            err.name = "Alias already exists";
          } else {
            dedupName.add(x.name);
          }
          return err;
        });
        errors.validators = result;
        if (values.requiredSignatures > values.validators.length) {
          errors.requiredSignatures = `Threshold too high. required number of signatures: ${values.requiredSignatures}, total amount of signers: ${values.validators.length}`;
        }

        const parsedDays = Number(values.days);
        if (
          !!values.days &&
          (isNaN(parsedDays) || !Number.isInteger(parsedDays) || parsedDays < 0)
        ) {
          errors.days = "Invalid days";
        }

        const parsedHours = Number(values.hours);
        if (
          !!values.hours &&
          (isNaN(parsedHours) ||
            !Number.isInteger(parsedHours) ||
            parsedHours < 0)
        ) {
          errors.hours = "Invalid hours";
        }

        const parsedMinutes = Number(values.minutes);
        if (
          !!values.minutes &&
          (isNaN(parsedMinutes) ||
            !Number.isInteger(parsedMinutes) ||
            parsedMinutes < 0)
        ) {
          errors.minutes = "Invalid minutes";
        }

        if (!values.days && !values.hours && !values.minutes) {
          errors.proposalDuration = "Please fill at least one field";
        }

        if (
          [values.days, values.hours, values.minutes].every(v => {
            const parsed = parseIntOr(v, undefined);
            return parsed === 0 || parsed === undefined;
          })
        ) {
          errors.proposalDuration = "One value must at least be more than 0";
        }

        if (!!values.bakerAddress) {
          if (validateAddress(values.bakerAddress) !== ValidationResult.VALID)
            errors.bakerAddress = `Invalid address ${values.bakerAddress}`;
          else {
            try {
              const account = await fetch(
                `${TZKT_API_URL}/v1/accounts/${values.bakerAddress}`
              ).then(res => res.json());

              if (account.type !== "delegate" || !account.activationLevel)
                errors.bakerAddress = "This address is not a baker";
              else if (!!account.deactivationLevel)
                errors.bakerAddress = "This baker is inactive";
            } catch (e) {
              errors.bakerAddress = "Failed to verify if address is a baker";
            }
          }
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
          await updateSettings(getOpsHelper(values));
          setResult(true);
          updateAliases(values.validators);
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
        const currentDuration = durationOfDaysHoursMinutes(
          values.days,
          values.hours,
          values.minutes
        ).toMillis();

        const hasNoChange = getOpsHelper(values).length === 0;

        return (
          <Form className="align-self-center flex h-full w-full grow flex-col items-center justify-center justify-self-center">
            <DelegatorHelper
              address={currentContract}
              setFieldValue={setFieldValue}
              bakerAddressRef={bakerAddressRef}
            />
            <div className="mb-2 self-start text-left text-lg text-white">
              Wallet participants
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
                            className="md:p-none flex min-w-full flex-col items-start justify-start space-y-4 md:flex-row md:space-x-4 md:space-y-0"
                            key={index}
                          >
                            <div className="flex w-full flex-col md:w-auto">
                              <label className="text-white">
                                <span className="md:hidden">Owner name</span>
                                {index === 0 ? (
                                  <span className="hidden md:inline">
                                    Owner Name
                                  </span>
                                ) : (
                                  ""
                                )}
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
                                {index === 0 ? (
                                  <span className="hidden md:inline">
                                    Owner address
                                  </span>
                                ) : (
                                  ""
                                )}
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
                    {values.validators.length > 0 &&
                      !!userAddress &&
                      !values.validators.find(v => v.address === userAddress) &&
                      renderWarning("Your address is not in the owners")}

                    <button
                      type="button"
                      className={`${
                        props.disabled ?? false
                          ? "pointer-events-none opacity-50"
                          : ""
                      } mx-auto my-2 block self-center justify-self-center rounded bg-primary p-2 font-medium text-white`}
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
              <label className="mr-4 text-lg text-white">Threshold </label>
              <Field
                disabled={props.disabled}
                className={`mt-2 w-full rounded p-2 text-center ${
                  props.disabled ? "bg-zinc-500" : ""
                }`}
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
              <div className="md:p-none mt-2 flex min-w-full flex-col items-start justify-start space-y-4 md:flex-row md:space-x-4 md:space-y-0">
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
              {props.disabled
                ? null
                : // @ts-ignore
                !!errors.proposalDuration
                ? // @ts-ignore
                  renderError(errors.proposalDuration)
                : currentDuration < PROPOSAL_DURATION_WARNING
                ? renderWarning(
                    "Proposal duration is low, you may not be able to execute the proposals"
                  )
                : null}
            </div>
            <div className="mt-4 w-full">
              <label className="block text-lg text-white">
                Delegate wallet
              </label>
              <Field
                disabled={props.disabled}
                name="bakerAddress"
                className="md:text-md mt-1 w-full rounded p-2 text-sm"
                placeholder="Baker address"
              />
              <ErrorMessage name="bakerAddress" render={renderError} />
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
