import { validateAddress } from "@taquito/utils";
import {
  ErrorMessage,
  Field,
  FieldArray,
  Form,
  Formik,
  FormikErrors,
} from "formik";
import { FC, useContext, useState } from "react";
import {
  AppDispatchContext,
  AppStateContext,
  contractStorage,
} from "../context/state";
import contract from "../context/unitContract";
import { adaptiveTime } from "../utils/adaptiveTime";
import { signers, VersionedApi } from "../versioned/apis";
import { ownersForm } from "../versioned/forms";
import ContractLoader from "./contractLoader";

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
}> = props => {
  const state = useContext(AppStateContext)!;
  let dispatch = useContext(AppDispatchContext)!;

  let [loading, setLoading] = useState(false);
  let [result, setResult] = useState<undefined | boolean>(undefined);
  if (state?.address == null) {
    return null;
  }

  const renderError = (message: string) => {
    return <p className="italic text-red-600">{message}</p>;
  };
  const initialProps: {
    validators: { name: string; address: string }[];
    requiredSignatures: number;
    effectivePeriod: number | undefined;
    validatorsError?: string;
  } = {
    validators: signers(props.contract).map(x => ({
      address: x,
      name: state.aliases[x] || "",
    })),
    effectivePeriod:
      props.contract.version >= "0.0.10"
        ? props.contract.effective_period
        : undefined,
    requiredSignatures: props.contract.threshold,
  };
  async function changeSettings(
    txs: { name: string; address: string }[],
    requiredSignatures: number,
    effectivePeriod: number | undefined
  ) {
    let cc = await state.connection.contract.at(props.address);
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
      typeof effectivePeriod !== "undefined" &&
      Number(effectivePeriod) != props.contract.effectivePeriod
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
    let api = VersionedApi(props.contract.version, props.address);
    await api.submitSettingsProposals(cc, state.connection, ops);
  }
  if (loading && typeof result == "undefined") {
    return <ContractLoader loading={loading}></ContractLoader>;
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
          <button
            onClick={() => {
              props.closeModal();
            }}
            type="button"
            className=" absolute right-4 top-4 ml-4 rounded-full bg-primary p-1 text-white hover:text-slate-400 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800 md:px-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-6 w-6 fill-white"
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
  return (
    <Formik
      enableReinitialize={true}
      initialValues={initialProps}
      validate={values => {
        const errors: {
          validators: { address: string; name: string }[];
          requiredSignatures?: any;
          validatorsError?: string;
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
        setLoading(true);
        try {
          await changeSettings(
            values.validators,
            values.requiredSignatures,
            values.effectivePeriod
          );
          setResult(true);
          dispatch!({ type: "updateAliaces", payload: values.validators });
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
      {({
        values,
        errors,
        setFieldTouched,
        setFieldValue,
        setTouched,
        validateForm,
      }) => (
        <Form className="align-self-center flex h-full w-full grow flex-col items-center justify-center justify-self-center">
          <div className="mb-2 self-center text-2xl font-medium text-white">
            Change wallet participants below
          </div>
          <ErrorMessage name={`validatorsError`} render={renderError} />
          <div className="mb-2 grid w-full grid-flow-row items-start gap-4">
            <FieldArray name="validators">
              {({ remove, push }) => (
                <div className="min-w-full">
                  {values.validators.length > 0 &&
                    values.validators.map((validator, index) => {
                      return (
                        <div
                          className=" md:p-none flex min-w-full flex-col items-start justify-start border-4 border-dashed border-white p-2 md:flex-row md:rounded-none md:border-none"
                          key={index}
                        >
                          <div className="flex flex-col">
                            <label className="text-white">Owner Name</label>
                            <Field
                              name={`validators.${index}.name`}
                              className="md:text-md p-2 text-sm"
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
                              Owner Address
                            </label>
                            <Field
                              name={`validators.${index}.address`}
                              className="md:text-md w-full border-2 p-2 text-sm"
                              placeholder={validator.address || "Owner address"}
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
                              " mx-none block self-center justify-self-end bg-primary p-1.5 font-medium text-white md:mx-auto md:self-end "
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
                    className=" my-2 mx-auto block self-center justify-self-center bg-primary p-2 font-medium text-white "
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
          <div className="flex w-full flex-col md:grow ">
            <label className="mr-4 text-white">Threshold: </label>
            <Field
              className="w-full text-center text-black"
              as="select"
              component="select"
              name="requiredSignatures"
              values={values.requiredSignatures}
            >
              {[
                ...Array(
                  Math.max(values.requiredSignatures, values.validators.length)
                ).keys(),
              ].map(idx => (
                <option
                  key={idx + values.validators.length}
                  label={`${idx + 1}/${values.validators.length}`}
                  value={idx + 1}
                ></option>
              ))}
            </Field>
            <ErrorMessage
              name={`requiredSignatures`}
              render={x => {
                return renderError(x);
              }}
            />
          </div>
          {typeof values.effectivePeriod != "undefined" && (
            <div className="flex w-full flex-col md:grow ">
              <label className="mr-4 text-white">
                EffectivePeriod(in seconds):{" "}
              </label>
              <Field
                className="w-full text-black"
                as="select"
                component="input"
                name="effectivePeriod"
                placeholder={props.contract.effectivePeriod}
              ></Field>
              <p className="text-lg text-white">
                {adaptiveTime(values.effectivePeriod.toString())}
              </p>
              <ErrorMessage
                name={`requiredSignatures`}
                render={x => {
                  return renderError(x);
                }}
              />
            </div>
          )}
          <div className="flex w-2/3 justify-between md:w-1/3">
            <button
              className=" hover:border-offset-2 hover:border-offset-gray-800 my-2 border-2 bg-primary p-2 font-medium text-white hover:border-gray-800 hover:bg-red-500  hover:outline-none  focus:bg-red-500"
              onClick={e => {
                e.preventDefault();
                props.closeModal();
              }}
            >
              Cancel
            </button>
            <button
              className="my-2 bg-primary p-2 font-medium text-white "
              type="submit"
            >
              Continue
            </button>
          </div>
        </Form>
      )}
    </Formik>
  );
};

export default SignersForm;
