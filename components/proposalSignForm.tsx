import { ErrorMessage, Field, Form, Formik } from "formik";
import React, { useContext, useState } from "react";
import { AppDispatchContext, AppStateContext } from "../context/state";
import { version, proposal } from "../types/display";
import { VersionedApi } from "../versioned/apis";
import ContractLoader from "./contractLoader";

function ProposalSignForm({
  address,
  proposal,
  id,
  version,
  state: modalState,
  closeModal,
  threshold,
  onSuccess,
}: {
  address: string;
  proposal: { og: any; ui: proposal };
  version: version;
  threshold: number;
  id: number;
  state: boolean | undefined;
  closeModal: () => void;
  onSuccess?: () => void;
}) {
  const state = useContext(AppStateContext)!;
  let [loading, setLoading] = useState(false);
  let [result, setResult] = useState<undefined | boolean>(undefined);
  const renderError = (message: string) => (
    <p className="italic text-red-600">{message}</p>
  );
  async function sign(
    proposal: number,
    prop: any,
    result: boolean | undefined,
    resolve: true | false
  ) {
    let cc = await state.connection.wallet.at(address);
    console.log(cc.methods.sign);
    let versioned = VersionedApi(version, address);

    await versioned.signProposal(
      cc,
      state.connection,
      proposal,
      result,
      Boolean(resolve)
    );
  }

  if (loading && typeof result == "undefined") {
    return <ContractLoader loading={loading}></ContractLoader>;
  }
  if (!loading && typeof result != "undefined") {
    return (
      <div className="flex w-full items-center justify-between md:h-12">
        <ContractLoader loading={loading}>
          {result ? (
            <div className="my-auto flex flex-row text-sm font-bold text-white md:text-xl">
              <span>Operation successful</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="ml-4 h-6 w-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            </div>
          ) : (
            <span className="my-auto text-sm font-bold text-white md:text-xl">
              Failed to sign
            </span>
          )}
          <button
            onClick={() => {
              closeModal();
            }}
            type="button"
            className=" absolute right-4 top-4 ml-4 rounded-full bg-primary p-1 text-white hover:text-slate-400 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800 md:px-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-6 w-6 fill-white"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </ContractLoader>
      </div>
    );
  }
  return (
    <Formik
      initialValues={{
        flag: typeof modalState === "undefined" ? true : false,
      }}
      onSubmit={async values => {
        setLoading(true);
        try {
          await sign(id, proposal.og, modalState, values.flag);
          onSuccess?.();
          setResult(true);
          setLoading(false);
        } catch (e) {
          console.log("Sign error: ", e);
          setResult(false);
        }
        setLoading(false);
        setTimeout(() => {
          closeModal();
        }, 1500);
      }}
    >
      <Form className="col-span-2 flex h-full max-w-full  flex-col items-center justify-center">
        <div className="mb-2 self-start  text-2xl font-medium text-white">
          Review and confirm the Action below:
        </div>
        <div className="mb-2 flex w-full max-w-full flex-col items-start md:flex-col ">
          <p className="text-lg font-medium text-white">
            Raw proposal contents:
          </p>
          <code className=" mb-2  mt-2 h-96 max-w-full overflow-y-auto break-words border-2 border-white p-2 font-medium text-white">
            {JSON.stringify(proposal.og, null, 2)}
          </code>
          <p className="text-lg font-medium text-white">
            Action:{" "}
            {typeof modalState === "boolean"
              ? modalState
                ? "Sign"
                : "Reject"
              : "Resolve"}
          </p>
        </div>
        {typeof modalState != "undefined" &&
          (modalState === false && threshold !== 1
            ? proposal.ui.signatures.length + 1 > threshold
            : proposal.ui.signatures.length + 1 >= threshold && (
                <div className="mb-2 flex w-full flex-col items-center justify-between md:flex-row ">
                  <label className="font-medium text-white">
                    Try to resolve immediately?:
                  </label>
                  <Field name="flag" as="select" className="rounded-md p-2">
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </Field>
                </div>
              ))}
        <ErrorMessage name="flag" render={renderError} />
        <div className="flex w-2/3 justify-between md:w-1/3">
          <button
            className="my-2 rounded border-2 bg-transparent p-2 font-medium text-white hover:outline-none"
            onClick={e => {
              e.preventDefault();
              closeModal();
            }}
          >
            Cancel
          </button>
          <button
            className="hover:border-offset-2 hover:border-offset-gray-800 my-2 rounded bg-primary p-2 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500"
            type="submit"
          >
            Confirm
          </button>
        </div>
      </Form>
    </Formik>
  );
}

export default ProposalSignForm;
