import { validateAddress } from "@taquito/utils";
import {
  Formik,
  Form,
  ErrorMessage,
  FieldArray,
  Field,
  FormikErrors,
} from "formik";
import { useContext } from "react";
import Meta from "../components/meta";
import { AppDispatchContext, AppStateContext } from "../context/state";

const renderError = (message: string) => {
  return <p className="italic text-red-600">{message}</p>;
};
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
function Home() {
  let state = useContext(AppStateContext)!;
  let dispatch = useContext(AppDispatchContext)!;
  let byAddress = state.aliases;
  let byName = Object.fromEntries(
    Object.entries(state.aliases).map(([k, v]) => [v, k])
  );
  const initialProps: {
    validators: {
      name: string;
      address: string;
      initial: { name: string; address: string };
    }[];
    validatorsError?: string;
  } = {
    validators: Object.entries(state.aliases).map(([k, v]) => ({
      name: v,
      address: k,
      initial: { name: v, address: k },
    })),
    validatorsError: "",
  };
  return (
    <div className="min-h-content relative flex grow flex-col">
      <Meta title={"Address book"} />
      <div>
        <div className="mx-auto flex max-w-7xl justify-start py-6 px-4 lg:px-8">
          <h1 className="text-2xl font-extrabold text-white">Address book</h1>
        </div>
      </div>
      <main className="grow">
        <div className="mx-auto max-w-7xl px-2 lg:px-8">
          <div className="grid-rows-auto md:grid-cols-auto grid min-h-full p-2 md:auto-rows-max">
            <Formik
              enableReinitialize={true}
              initialValues={initialProps}
              validate={values => {
                console.log("Validate:", values);
                const errors: {
                  validators: { address: string; name: string }[];
                  validatorsError?: string;
                } = { validators: [] };
                if (values.validators.length < 1) {
                  errors.validatorsError = "Should be at least one owner";
                }
                let result = values.validators.map(x => {
                  let err = { address: "", name: "" };
                  if (!x.address) {
                    err.address = "Please provide an address";
                  }
                  if (
                    values.validators.reduce(
                      (acc, curr) => acc + (curr.address === x.address ? 1 : 0),
                      0
                    ) > 1 &&
                    x.initial.address !== x.address
                  ) {
                    err.address = "already exists";
                  } else {
                    err.address =
                      validateAddress(x.address) !== 3
                        ? `invalid address ${x.address}`
                        : "";
                  }
                  if (!!x.name && byName[x.name] && x.initial.name !== x.name) {
                    err.name = "already exists";
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
                dispatch!({
                  type: "updateAliases",
                  payload: values.validators,
                });
              }}
            >
              {({ values, errors, validateForm, setTouched, handleReset }) => (
                <Form className="align-self-center col-span-2 flex w-full grow flex-col items-center justify-center justify-self-center">
                  <div className="mt-4 self-center text-2xl font-medium text-white">
                    Modify saved names and addresses below
                  </div>
                  <ErrorMessage name={`validatorsError`} render={renderError} />
                  <div className="mt-8 grid w-full grid-flow-row items-start gap-4">
                    <FieldArray name="validators">
                      {({ remove, unshift }) => (
                        <div>
                          <div className="flex space-x-8">
                            <button
                              type="button"
                              className="my-2 mx-auto block w-full self-center justify-self-center rounded border border-white bg-transparent p-2 font-medium text-white"
                              onClick={e => {
                                e.preventDefault();
                                unshift({
                                  name: "",
                                  address: "",
                                  initial: { name: "", address: "" },
                                });
                              }}
                            >
                              Add an address
                            </button>
                            <button
                              className="my-2 w-full rounded bg-primary p-2 font-medium text-white hover:bg-red-500"
                              type="submit"
                            >
                              Save
                            </button>
                          </div>
                          <div className="mt-4 min-w-full">
                            {values.validators.length > 0 &&
                              values.validators.map((validator, index) => {
                                return (
                                  <div
                                    className={`${
                                      index !== 0 ? "lg:-mt-12" : ""
                                    } md:p-none flex min-w-full flex-col items-start justify-start py-2 md:flex-row md:space-x-4 md:rounded-none md:border-none`}
                                    key={index}
                                  >
                                    <div className="grid w-full grid-flow-col grid-cols-1 grid-rows-3">
                                      <label className="text-white">
                                        <span
                                          className={`${
                                            index === 0 ? "" : "lg:hidden"
                                          }`}
                                        >
                                          Name
                                        </span>
                                      </label>

                                      <Field
                                        name={`validators.${index}.name`}
                                        className="md:text-md rounded p-2 text-sm"
                                        placeholder={validator.name || "Name"}
                                      />
                                      <ErrorMessage
                                        name={`validators.${index}.name`}
                                        render={renderError}
                                      />
                                    </div>
                                    <div className="grid w-full grid-flow-col grid-cols-1 grid-rows-3 md:grow">
                                      <label
                                        className="text-white"
                                        htmlFor={`validators.${index}.address`}
                                      >
                                        <span
                                          className={`${
                                            index === 0 ? "" : "lg:hidden"
                                          }`}
                                        >
                                          Address
                                        </span>
                                      </label>

                                      <Field
                                        name={`validators.${index}.address`}
                                        className="md:text-md w-full rounded p-2 text-sm"
                                        placeholder={
                                          validator.address || "Address"
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
                                        "mx-none block self-center justify-self-center rounded bg-primary p-1.5 font-medium text-white hover:bg-red-500 md:mx-auto md:self-center "
                                      }
                                      onClick={async e => {
                                        e.preventDefault();
                                        setTouched(
                                          { validatorsError: true },
                                          true
                                        );

                                        remove(index);
                                      }}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </FieldArray>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Home;
