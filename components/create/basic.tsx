import { ErrorMessage, Field, Form, Formik } from "formik";
import Link from "next/link";
import { useContext } from "react";
import FormContext from "../../context/formContext";
import { AppStateContext } from "../../context/state";
import renderError from "../formUtils";

function Basic() {
  const { activeStepIndex, setActiveStepIndex, formState, setFormState } =
    useContext(FormContext)!;
  const state = useContext(AppStateContext)!;

  const byName = Object.fromEntries(
    Object.entries(state?.aliases || {}).map(([k, v]) => [v, k])
  );

  return (
    <Formik
      initialValues={{
        walletName: "TzSafe Wallet",
        version: "0.3.3",
      }}
      validate={values => {
        let errors: any = {};
        if (byName[values.walletName]) {
          errors.walletName = `Contract name already taken by ${
            byName[values.walletName]
          }`;
        }
        if (!values.version) {
          errors.version = "Version selection is required";
        }
        return errors;
      }}
      onSubmit={values => {
        const data = { ...formState, requiredSignatures: 1, ...values };
        setFormState(data as any);
        setActiveStepIndex(activeStepIndex + 1);
      }}
    >
      <Form className="align-self-center items-left col-span-2 flex flex-col justify-center justify-self-center">
        <div className="mb-2 self-center text-2xl font-medium text-white">
          Enter your wallet name and select version below
        </div>
        <div className="mt-4 flex w-full flex-col items-start md:w-auto">
          <label className="font-medium text-white">Wallet name</label>
          <Field
            name="walletName"
            className=" mt-2 w-full rounded p-2"
            placeholder="example-wallet"
          />
        </div>
        <ErrorMessage name="walletName" render={renderError} />
        <div className="mt-6">
          <label className="font-medium text-white">Select Version</label>
          <div className="mt-2">
            <label className="flex items-center text-white">
              <Field
                type="radio"
                name="version"
                value="0.3.3"
                className="mr-2 "
                checked
              />
              <div>v0.3.3</div>
            </label>
            <div className="ml-2 text-sm text-gray-500">
              {
                "This version doesn't support for TZIP27 in processing proof-of-event challenges for message signing. If such functionality is unnecessary, this version is recommended. The creation fee is roughly 1.8 tez, depending on the count of owners."
              }
            </div>
          </div>
          <div className="mt-2">
            <label className="flex items-center text-white">
              <Field
                type="radio"
                name="version"
                value="0.3.4"
                className="mr-2"
              />
              <div>v0.3.4</div>
            </label>
            <div className="ml-2 text-sm text-gray-500">
              {
                "This version fully supports for TZIP27. The createion fee is roughly 2.1 tez."
              }
            </div>
          </div>
          <ErrorMessage name="version" render={renderError} />
        </div>
        <div className="mt-8 flex space-x-6">
          <Link
            type="button"
            href="/"
            className="my-2 rounded border-2 bg-transparent p-2 font-medium text-white hover:outline-none"
          >
            Cancel
          </Link>
          <button
            className={`${
              !state.address ? "pointer-events-none opacity-50" : ""
            } my-2 rounded bg-primary p-2 font-medium text-white hover:outline-none`}
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
