import { validateAddress } from "@taquito/utils";
import {
  ErrorMessage,
  Field,
  FieldArray,
  FieldHookConfig,
  Form,
  Formik,
  FormikErrors,
  useField,
} from "formik";
import React, { FC } from "react";
import { useContext } from "react";
import FormContext from "../../context/formContext";
import { AppStateContext } from "../../context/state";
import { adaptiveTime } from "../../utils/adaptiveTime";
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
  const renderError = (message: string) => {
    return <p className="italic text-red-600">{message}</p>;
  };
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
            (dedupName.has(x.name) || byName[x.name] !== x.address)
          ) {
            err.name = "alias already exists";
          } else {
            dedupName.add(x.name);
          }
          return err;
        });
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
                          className=" md:p-none flex min-w-full flex-col items-start justify-start space-x-4 border-4 border-dashed border-white p-2 md:flex-row md:rounded-none md:border-none"
                          key={index}
                        >
                          <div className="grid grid-flow-col grid-cols-1 grid-rows-3">
                            <label className="text-white">Owner Name</label>
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
                              className="md:text-md p-2 text-sm"
                              placeholder={validator.name || "Owner Name"}
                            />
                            <ErrorMessage
                              name={`validators.${index}.name`}
                              render={renderError}
                            />
                          </div>
                          <div className="grid grid-flow-col grid-cols-1 grid-rows-3 md:grow">
                            <label
                              className="text-white"
                              htmlFor={`validators.${index}.address`}
                            >
                              Owner Address
                            </label>
                            <Field
                              name={`validators.${index}.address`}
                              className="md:text-md w-full p-2 text-sm"
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
                              " mx-none block self-center justify-self-center bg-primary p-1.5 font-medium text-white md:mx-auto md:self-center "
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
                    Add owner
                  </button>
                </div>
              )}
            </FieldArray>
          </div>
          <div className="flex w-full grow flex-col p-2">
            <label className="mr-4 text-white">Threshold: </label>
            <Field
              component="select"
              name="requiredSignatures"
              className="w-1/4 text-center text-black"
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
              EffectivePeriod(in seconds):
            </label>
            <Field
              component="input"
              className="pl-4 text-black"
              name="effectivePeriod"
              values={values.requiredSignatures}
              validate={(value: string) => {
                let error;
                if (isNaN(Number(value))) {
                  error = "invalid effective period";
                }
                return error;
              }}
            />
            <p className="text-lg text-white">
              {adaptiveTime(values.effectivePeriod.toString())}
            </p>
            <ErrorMessage
              name={`effectivePeriod`}
              render={x => {
                return renderError(x);
              }}
            />
          </div>
          <button
            className="my-2 bg-primary p-2 font-medium text-white "
            type="submit"
          >
            Continue
          </button>
        </Form>
      )}
    </Formik>
  );
}

export default Aliases;
