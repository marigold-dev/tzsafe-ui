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
      <div className="bg-graybg shadow">
        <div className="mx-auto flex max-w-7xl justify-start py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-extrabold text-white">Address book</h1>
        </div>
      </div>
      <main className="h-full grow">
        <div className="mx-auto h-full min-h-full max-w-7xl py-6 sm:px-6 lg:px-8">
          <div className="h-full min-h-full px-4 py-6 sm:px-0">
            <div className="grid-rows-auto md:grid-cols-auto grid h-96 min-h-full overflow-y-auto  p-2 md:auto-rows-max">
              <Formik
                enableReinitialize={true}
                initialValues={initialProps}
                validate={values => {
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
                      byAddress[x.address] &&
                      x.initial.address !== x.address
                    ) {
                      err.address = "already exists";
                    } else {
                      err.address =
                        validateAddress(x.address) !== 3
                          ? `invalid address ${x.address}`
                          : "";
                    }
                    if (
                      !!x.name &&
                      byName[x.name] &&
                      x.initial.name !== x.name
                    ) {
                      err.name = "already exists";
                    }

                    if (!x.name) {
                      err.name = "Please provide an alias";
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
                    type: "updateAliaces",
                    payload: values.validators,
                  });
                }}
              >
                {({
                  values,
                  errors,
                  validateForm,
                  setTouched,
                  handleReset,
                }) => (
                  <Form className="align-self-center col-span-2 flex w-full grow flex-col items-center justify-center justify-self-center">
                    <div className="mb-2 self-center text-2xl font-medium text-white">
                      Modify saved Names & Addresses below
                    </div>
                    <div className="grid w-full grid-flow-row grid-rows-2 gap-2 md:grid-flow-col md:grid-cols-2 md:grid-rows-1 md:justify-around">
                      <button
                        className="my-2 w-full bg-primary p-2 font-medium text-white "
                        onClick={handleReset}
                      >
                        Reset
                      </button>
                      <button
                        className="my-2 w-full bg-primary p-2 font-medium text-white"
                        type="submit"
                      >
                        Save
                      </button>
                    </div>
                    <ErrorMessage
                      name={`validatorsError`}
                      render={renderError}
                    />
                    <div className="mb-2 grid w-full grid-flow-row items-start gap-4">
                      <FieldArray name="validators">
                        {({ remove, unshift }) => (
                          <div>
                            {" "}
                            <button
                              type="button"
                              className=" my-2 mx-auto block w-full self-center justify-self-center bg-primary p-2 font-medium text-white"
                              onClick={e => {
                                e.preventDefault();
                                unshift({
                                  name: "",
                                  address: "",
                                  initial: { name: "", address: "" },
                                });
                              }}
                            >
                              Add name
                            </button>
                            <div className="min-w-full">
                              {values.validators.length > 0 &&
                                values.validators.map((validator, index) => {
                                  return (
                                    <div
                                      className=" md:p-none flex min-w-full flex-col items-start justify-start  p-2 md:flex-row md:rounded-none md:border-none"
                                      key={index}
                                    >
                                      <div className="grid w-full grid-flow-col grid-cols-1 grid-rows-3">
                                        <label className="text-white">
                                          Name
                                        </label>
                                        <Field
                                          name={`validators.${index}.name`}
                                          className="md:text-md p-2 text-sm"
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
                                          Address
                                        </label>
                                        <Field
                                          name={`validators.${index}.address`}
                                          className="md:text-md w-full p-2 text-sm"
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
                                          " mx-none block self-center justify-self-center bg-primary p-1.5 font-medium text-white md:mx-auto md:self-center "
                                        }
                                        onClick={async e => {
                                          e.preventDefault();
                                          setTouched(
                                            { validatorsError: true },
                                            true
                                          );
                                          validateForm();
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
        </div>
      </main>
    </div>
  );
}

export default Home;
