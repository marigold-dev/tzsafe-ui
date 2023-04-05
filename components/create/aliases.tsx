import { validateAddress } from "@taquito/utils";
import {
  ErrorMessage,
  Field,
  FieldArray,
  Form,
  Formik,
  FormikErrors,
} from "formik";
import Link from "next/link";
import React from "react";
import { useContext } from "react";
import FormContext from "../../context/formContext";
import { AppStateContext } from "../../context/state";
import { adaptiveTime } from "../../utils/adaptiveTime";
import renderError from "../renderError";
import TextInputWithCompletion from "../textInputWithComplete";

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

function Aliases() {
  const { activeStepIndex, setActiveStepIndex, formState, setFormState } =
    useContext(FormContext)!;
  const state = useContext(AppStateContext);
  let byName = Object.fromEntries(
    Object.entries(state?.aliases || {}).map(([k, v]) => [v, k])
  );
  if (state?.address == null) {
    return null;
  }

  const initialProps: {
    validators: { name: string; address: string }[];
    requiredSignatures: number;
    effectivePeriod: number;
    validatorsError?: string;
  } = {
    validators: [
      { address: state.address!, name: state.aliases[state.address!] || "" },
    ],
    requiredSignatures: 1,
    effectivePeriod: 86_400 * 7,
    validatorsError: "",
  };
  return (
    <Formik
      initialValues={initialProps}
      validate={values => {
        const errors: {
          validators: { address: string; name: string }[];
          validatorsError?: string;
          effectivePeriod?: string;
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

          if (
            !!x.name &&
            (dedupName.has(x.name) ||
              (!!byName[x.name] && byName[x.name] !== x.address))
          ) {
            err.name = "alias already exists";
          } else {
            dedupName.add(x.name);
          }
          return err;
        });

        const parsedNumber = Number(values.effectivePeriod);
        if (isNaN(parsedNumber) || parsedNumber <= 0) {
          errors.effectivePeriod = "Invalid duration";
          return errors;
        }

        if (
          result.every(x => x.address === "" && x.name === "") &&
          typeof errors.validatorsError == "undefined"
        ) {
          return;
        }

        errors.validators = result;
        return errors;
      }}
      onSubmit={values => {
        const data = { ...formState, ...values };
        setFormState(_ => data);
        setActiveStepIndex(activeStepIndex + 1);
      }}
    >
      {({ values, errors, validateForm, setTouched }) => (
        <Form className="align-self-center col-span-2 flex w-full grow flex-col items-center justify-center justify-self-center">
          <div className="mb-2 self-center text-2xl font-medium text-white">
            Add wallet participants below
          </div>
          <ErrorMessage name={`validatorsError`} render={renderError} />
          <div className="mb-2 grid w-full grid-flow-row items-start gap-4">
            <FieldArray name="validators">
              {({ remove, push, replace }) => (
                <div className="min-w-full">
                  {values.validators.length > 0 &&
                    values.validators.map((validator, index) => {
                      return (
                        <div
                          className={`${
                            index > 0 ? "-mt-8" : ""
                          } md:p-none flex min-w-full flex-col items-start justify-start px-2 md:flex-row md:space-x-4 md:rounded-none md:border-none`}
                          key={index}
                        >
                          <div className="grid w-full grid-flow-col grid-cols-1 grid-rows-3 md:w-auto">
                            <label className="text-white">
                              {index === 0 ? "Owner Name" : ""}
                            </label>

                            <TextInputWithCompletion
                              byAddrToo={false}
                              filter={() => true}
                              setTerms={({ payload, term }) => {
                                replace(index, {
                                  ...validator,
                                  name: term,
                                  address: payload,
                                });
                              }}
                              name={`validators.${index}.name`}
                              className="md:text-md w-full rounded p-2 text-sm"
                              placeholder={validator.name || "Owner Name"}
                            />
                            <ErrorMessage
                              name={`validators.${index}.name`}
                              render={renderError}
                            />
                          </div>
                          <div className="grid w-full grid-flow-col grid-cols-1 grid-rows-3 md:w-auto md:grow">
                            <label
                              className="text-white"
                              htmlFor={`validators.${index}.address`}
                            >
                              {index === 0 ? "Owner Address" : ""}
                            </label>

                            <Field
                              name={`validators.${index}.address`}
                              className="md:text-md w-full rounded p-2 text-sm"
                              placeholder={validator.address || "Owner address"}
                              default={validator.address}
                            />
                            <ErrorMessage
                              name={`validators.${index}.address`}
                              render={renderError}
                            />
                          </div>
                          <div className="grid w-full grid-flow-col grid-cols-1 grid-rows-3 md:w-auto">
                            <span className="hidden md:inline"></span>
                            <button
                              type="button"
                              className={
                                (errors.validators &&
                                errors.validators[index] &&
                                get(errors.validators[index])
                                  ? "my-auto"
                                  : "") +
                                " mx-none block self-center justify-self-center rounded bg-primary p-1.5 font-medium text-white md:mx-auto md:self-center "
                              }
                              onClick={async e => {
                                e.preventDefault();
                                setTouched({ validatorsError: true }, true);
                                validateForm();
                                remove(index);
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  <button
                    type="button"
                    className="mx-auto block self-center justify-self-center rounded bg-primary p-2 font-medium text-white md:mt-4 "
                    onClick={e => {
                      e.preventDefault();
                      push({ name: "", address: "" });
                    }}
                  >
                    Add owner
                  </button>
                </div>
              )}
            </FieldArray>
          </div>
          <div className="flex w-full grow flex-col p-2">
            <label className="mr-4 text-white">Threshold </label>
            <Field
              component="select"
              name="requiredSignatures"
              className="mt-2 w-full rounded p-2 text-center text-black"
              values={values.requiredSignatures}
            >
              {values.validators.map((_, idx) => (
                <option
                  key={idx + values.validators.length}
                  label={`${idx + 1}/${values.validators.length}`}
                  value={idx + 1}
                >
                  {idx + 1}/{values.validators.length}
                </option>
              ))}
            </Field>
          </div>
          <div className="flex w-full grow flex-col p-2">
            <label className="mr-4 text-white">
              Proposal duration (in seconds)
            </label>
            <Field
              component="input"
              className="mt-2 rounded p-2 text-black"
              name="effectivePeriod"
              values={values.requiredSignatures}
            />
            <p className="mt-2 text-lg text-white">
              {adaptiveTime(values.effectivePeriod.toString())}
            </p>
            <ErrorMessage name={`effectivePeriod`} render={renderError} />
          </div>
          <div className="mt-8 mb-8 flex space-x-6">
            <Link
              type="button"
              href="/"
              className="my-2 rounded border-2 bg-transparent p-2 font-medium text-white hover:outline-none"
            >
              Cancel
            </Link>
            <button
              className="my-2 rounded bg-primary p-2 font-medium text-white hover:outline-none "
              type="submit"
            >
              Continue
            </button>
          </div>
        </Form>
      )}
    </Formik>
  );
}

export default Aliases;
