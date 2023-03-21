import { ErrorMessage, Field, Form, Formik } from "formik";
import Link from "next/link";
import { useContext } from "react";
import FormContext from "../../context/formContext";
import { AppStateContext } from "../../context/state";

function Basic() {
  const { activeStepIndex, setActiveStepIndex, formState, setFormState } =
    useContext(FormContext)!;
  const state = useContext(AppStateContext)!;

  const renderError = (message: string) => (
    <p className="italic text-red-600">{message}</p>
  );
  let byName = Object.fromEntries(
    Object.entries(state?.aliases || {}).map(([k, v]) => [v, k])
  );

  return (
    <Formik
      initialValues={{
        walletName: "example-wallet",
      }}
      validate={values => {
        let errors: any = {};
        if (byName[values.walletName]) {
          errors.walletName = `Contract name already taken by ${
            byName[values.walletName]
          }`;
        }
        return errors;
      }}
      onSubmit={values => {
        const data = { ...formState, requiredSignatures: 1, ...values };
        setFormState(data as any);
        setActiveStepIndex(activeStepIndex + 1);
      }}
    >
      <Form className="align-self-center col-span-2 flex flex-col items-center justify-center justify-self-center">
        <div className="mb-2 self-center text-2xl font-medium text-white">
          Enter your wallet name below
        </div>
        <div className="mt-4 flex flex-col items-start">
          <label className="font-medium text-white">Wallet name</label>
          <Field
            name="walletName"
            className=" mt-2 w-full rounded p-2"
            placeholder="example-wallet"
          />
        </div>
        <ErrorMessage name="walletName" render={renderError} />
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
    </Formik>
  );
}

export default Basic;
