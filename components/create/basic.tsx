import { ErrorMessage, Field, Form, Formik } from "formik";
import Link from "next/link";
import { useContext } from "react";
import { useAliases } from "../../context/aliases";
import FormContext from "../../context/formContext";
import { useAppState } from "../../context/state";
import { useWallet } from "../../context/wallet";
import renderError from "../formUtils";

function Basic() {
  const { activeStepIndex, setActiveStepIndex, formState, setFormState } =
    useContext(FormContext)!;
  const { userAddress } = useWallet();
  const { addressBook } = useAliases();

  const byName = Object.fromEntries(
    Object.entries(addressBook).map(([k, v]) => [v, k])
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
                "This version enables DApps to integrate with the TzSafe app for login purposes, although it does not support message signing in TZIP27. If message signing is not essential for your usage, opting for version 0.3.3 is recommended. The creation fee is roughly 1.8 tez, depending on the count of owners."
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
                "This version supports message signing in TZIP27. The creation fee is roughly 2.1 tez"
              }
            </div>
          </div>
          <ErrorMessage name="version" render={renderError} />
        </div>
        <div className="mt-8 flex justify-center space-x-6">
          <Link
            type="button"
            href="/"
            className="my-2 rounded border-2 bg-transparent p-2 font-medium text-white hover:outline-none"
          >
            Cancel
          </Link>
          <button
            className={`${
              !userAddress ? "pointer-events-none opacity-50" : ""
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
