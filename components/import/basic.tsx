import { tzip16 } from "@taquito/tzip16";
import { validateContractAddress } from "@taquito/utils";
import { ErrorMessage, Field, Form, Formik } from "formik";
import { useSearchParams } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import FormContext from "../../context/formContext";
import fetchVersion from "../../context/metadata";
import { AppStateContext } from "../../context/state";
import { signers, toStorage } from "../../versioned/apis";

function Basic() {
  const { activeStepIndex, setActiveStepIndex, formState, setFormState } =
    useContext(FormContext)!;
  const state = useContext(AppStateContext)!;
  let params = useSearchParams();
  const renderError = (message: string) => (
    <p className="italic text-red-600">{message}</p>
  );
  let [initialState, set] = useState({
    walletName: "example-wallet",
    walletAddress: formState?.walletAddress || "",
  });
  let byName = Object.fromEntries(
    Object.entries(state?.aliases || {}).map(([k, v]) => [v, k])
  );

  useEffect(() => {
    if (!initialState.walletAddress && !!params.get("address")) {
      set(initial => ({
        ...initial,
        walletAddress: params.get("address") || "",
      }));
    }
  }, [params, formState, initialState.walletAddress]);
  return (
    <Formik
      enableReinitialize={true}
      initialValues={initialState}
      validate={async values => {
        let errors: any = {};
        if (validateContractAddress(values.walletAddress) !== 3) {
          errors.walletAddress = `Invalid address ${values.walletAddress}`;
        }
        let exists = await (async () => {
          try {
            await state.connection.contract.at(values.walletAddress);
            return true;
          } catch (e) {
            return false;
          }
        })();
        if (!exists) {
          errors.walletAddress = `Contract does not exist at address ${values.walletAddress}`;
        }
        if (state.contracts[values.walletAddress]) {
          errors.walletName = `Contract already imported ${values.walletAddress}`;
        }
        if (byName[values.walletName]) {
          errors.walletName = `Contract name already taken: ${
            byName[values.walletName]
          }`;
        }
        return errors;
      }}
      onSubmit={async values => {
        const contract = await state.connection.contract.at(
          values.walletAddress,
          tzip16
        );
        const storage: any = await contract.storage();
        let version = await fetchVersion(contract!);

        let balance = await state?.connection.tz.getBalance(
          values.walletAddress
        );
        let v = toStorage(version, storage, balance);
        const validators = signers(v).map((x: string) => ({
          address: x,
          name: state.aliases[x] || "",
        }));
        const data = {
          ...formState,
          ...values,
          validators,
          requiredSignatures: storage.threshold.toNumber(),
        };
        setFormState(data as any);
        setActiveStepIndex(activeStepIndex + 1);
      }}
    >
      <Form className="align-self-center col-span-2 flex w-full flex-col items-center justify-center justify-self-center">
        <div className="mb-2 self-center text-2xl font-medium text-white">
          Enter imported wallet name and address below
        </div>
        <div className="flex w-full flex-col justify-center space-x-4 md:flex-row">
          <div className="flex w-1/2 flex-col">
            <div className="mb-2 flex w-full flex-col items-start">
              <label className="font-medium text-white">Wallet name</label>
              <Field
                name="walletName"
                className=" w-full p-2"
                placeholder="example-wallet"
              />
            </div>
            <ErrorMessage name="walletName" render={renderError} />
          </div>
          <div className="flex w-1/2 flex-col ">
            <div className="mb-2 flex w-full flex-col items-start">
              <label className="font-medium text-white">Wallet address</label>
              <Field
                name="walletAddress"
                className=" w-full p-2"
                placeholder="your wallet address"
              />
            </div>
            <ErrorMessage name="walletAddress" render={renderError} />
          </div>
        </div>
        <button
          className="my-2 bg-primary p-2 font-medium text-white  hover:outline-none "
          type="submit"
        >
          Continue
        </button>
      </Form>
    </Formik>
  );
}

export default Basic;
