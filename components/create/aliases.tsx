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
      validate={(values) => {
        const errors: {
          validators: { address: string; name: string }[];
          validatorsError?: string;
        } = { validators: [] };
        let dedup = new Set();
        let dedupName = new Set();
        if (values.validators.length < 1) {
          errors.validatorsError = "Should be at least one owner";
        }
        let result = values.validators.map((x) => {
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
          if (!!x.name && (dedupName.has(x.name) || byName[x.name])) {
            err.name = "alias already exists";
          } else {
            dedupName.add(x.name);
          }
          return err;
        });
        if (
          result.every((x) => x.address === "" && x.name === "") &&
          typeof errors.validatorsError == "undefined"
        ) {
          return;
        }
        errors.validators = result;
        return errors;
      }}
      onSubmit={(values) => {
        const data = { ...formState, ...values };
        setFormState((_) => data);
        setActiveStepIndex(activeStepIndex + 1);
      }}
    >
      {({ values, errors, validateForm, setTouched }) => (
        <Form className="w-full flex grow flex-col justify-center items-center align-self-center justify-self-center col-span-2">
          <div className="text-2xl font-medium self-center mb-2 text-white">
            Add wallet participants below
          </div>
          <ErrorMessage name={`validatorsError`} render={renderError} />
          <div className="grid grid-flow-row gap-4 items-start mb-2 w-full">
            <FieldArray name="validators">
              {({ remove, push, replace }) => (
                <div className="min-w-full">
                  {values.validators.length > 0 &&
                    values.validators.map((validator, index) => {
                      return (
                        <div
                          className=" border-4 border-dashed border-white md:rounded-none md:border-none md:p-none p-2 flex md:flex-row flex-col justify-start items-start min-w-full"
                          key={index}
                        >
                          <div className="grid grid-rows-3 grid-flow-col grid-cols-1">
                            <label className="text-white">Owner Name</label>
                            <TextInputWithCompletion
                              setTerms={({ payload, term }) => {
                                replace(index, {
                                  ...validator,
                                  name: term,
                                  address: payload,
                                });
                              }}
                              name={`validators.${index}.name`}
                              className="border-2 p-2 text-sm md:text-md"
                              placeholder={validator.name || "Owner Name"}
                            />
                            <ErrorMessage
                              name={`validators.${index}.name`}
                              render={renderError}
                            />
                          </div>
                          <div className="grid grid-rows-3 grid-flow-col grid-cols-1 md:grow">
                            <label
                              className="text-white"
                              htmlFor={`validators.${index}.address`}
                            >
                              Owner Address
                            </label>
                            <Field
                              name={`validators.${index}.address`}
                              className="w-full border-2 p-2 text-sm md:text-md"
                              placeholder={validator.address || "Owner address"}
                              default={validator.address}
                            />
                            <ErrorMessage
                              name={`validators.${index}.address`}
                              render={(x) => {
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
                              " bg-primary font-medium text-white p-1.5 md:self-center self-center justify-self-center block md:mx-auto mx-none "
                            }
                            onClick={async (e) => {
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
                    className=" bg-primary font-medium text-white my-2 p-2 self-center justify-self-center block mx-auto "
                    onClick={(e) => {
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
          <div className="flex grow flex-col w-full p-2">
            <label className="text-white mr-4">Threshold: </label>
            <Field
              component="select"
              name="requiredSignatures"
              className="w-1/4 text-black text-center"
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
          <div className="flex grow flex-col w-full p-2">
            <label className="text-white mr-4">
              EffectivePeriod(in seconds):
            </label>
            <Field
              component="input"
              className="text-black pl-4"
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
            <ErrorMessage
              name={`effectivePeriod`}
              render={(x) => {
                return renderError(x);
              }}
            />
          </div>
          <button
            className="bg-primary font-medium text-white my-2 p-2 "
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
