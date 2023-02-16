import { validateAddress } from "@taquito/utils";
import {
  ErrorMessage,
  Field,
  FieldArray,
  Form,
  Formik,
  FormikErrors,
} from "formik";
import { useContext } from "react";
import FormContext from "../../context/formContext";
import { AppStateContext } from "../../context/state";

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
  if (state?.address == null) {
    return null;
  }
  const renderError = (message: string) => {
    return <p className="italic text-red-600">{message}</p>;
  };
  let byName = Object.fromEntries(
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
            (dedupName.has(x.name) || byName[x.name] !== x.address)
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
            Optionally add names of wallet participants below:{" "}
          </div>
          <div className="mb-2 grid w-full grid-flow-row items-start gap-4">
            <FieldArray name="validators">
              {() => (
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
                              className="md:text-md border-2 p-2 text-sm"
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
                              disabled
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
                        </div>
                      );
                    })}
                </div>
              )}
            </FieldArray>
          </div>
          <div className="flex grow">
            <label className="mr-4 text-white">Threshold: </label>
            <Field
              disabled
              component="select"
              name="requiredSignatures"
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
