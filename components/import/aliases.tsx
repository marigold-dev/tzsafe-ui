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
import { useContext } from "react";
import FormContext from "../../context/formContext";
import { AppStateContext } from "../../context/state";
import { adaptiveTime } from "../../utils/adaptiveTime";
import renderError from "../renderError";

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

  const byName = Object.fromEntries(
    Object.entries(state?.aliases || {}).map(([k, v]) => [v, k])
  );
  const initialProps: {
    validators: { name: string; address: string }[];
    requiredSignatures: number;
  } = {
    validators: formState?.validators!,
    requiredSignatures: formState?.requiredSignatures!,
  };

  return (
    <Formik
      initialValues={initialProps}
      validate={values => {
        const errors: { validators: { address: string; name: string }[] } = {
          validators: [],
        };
        let dedup = new Set();
        let dedupName = new Set();

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
        if (result.every(x => x.address === "" && x.name === "")) {
          return;
        }
        errors.validators = result;
        return errors;
      }}
      onSubmit={values => {
        const data = { ...formState, ...values };
        setFormState(data as any);
        setActiveStepIndex(activeStepIndex + 1);
      }}
    >
      {({ values, errors }) => (
        <Form className="align-self-center col-span-2 flex w-full grow flex-col items-center justify-center justify-self-center">
          <div className="mb-2 self-center text-2xl font-medium text-white">
            Optionally add names of wallet participants below
          </div>
          <div className="mb-2 mt-4 grid w-full grid-flow-row items-start gap-4">
            <FieldArray name="validators">
              {() => (
                <div className="min-w-full space-y-4 md:space-y-0">
                  {values.validators.length > 0 &&
                    values.validators.map((validator, index) => {
                      return (
                        <div
                          className={`md:p-none mt-2 flex min-w-full flex-col items-start justify-start space-y-2 md:flex-row md:space-y-0 md:space-x-4 md:rounded-none md:border-none`}
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
                              name={`validators.${index}.name`}
                              className="md:text-md mt-2 rounded p-2 text-sm"
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
                              <span className="md:hidden">Owner Address</span>
                              {index === 0 ? (
                                <span className="hidden md:inline">
                                  Owner Address
                                </span>
                              ) : (
                                ""
                              )}
                            </label>
                            <Field
                              disabled
                              name={`validators.${index}.address`}
                              className="md:text-md mt-2 w-full rounded p-2 text-sm"
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
                        </div>
                      );
                    })}
                </div>
              )}
            </FieldArray>
          </div>
          <div className="mt-4 flex w-full flex-col md:grow">
            <label className="mr-4 text-white">Threshold </label>
            <Field
              disabled
              component="select"
              name="requiredSignatures"
              values={values.requiredSignatures}
              className="mt-2 w-full rounded p-2 text-center"
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
          {!!formState?.effectivePeriod && (
            <div className="mt-4 flex w-full flex-col md:grow">
              <label className="mr-4 text-white">
                Proposal duration (in seconds)
              </label>
              <Field
                disabled
                component="input"
                name="effectivePeriod"
                value={formState.effectivePeriod}
                className="mt-2 w-full rounded p-2"
              />
              <p className="mt-2 text-lg text-white">
                {adaptiveTime(formState.effectivePeriod.toString())}
              </p>
              <ErrorMessage name={`effectivePeriod`} render={renderError} />
            </div>
          )}
          <div className="mt-8 flex space-x-6">
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
