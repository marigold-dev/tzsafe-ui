import { ErrorMessage, Field, Form, Formik } from "formik";
import React, { useContext, useState } from "react";
import { AppDispatchContext, AppStateContext } from "../context/state";
import ContractLoader from "./contractLoader";
import { VersionedApi } from "../versioned/apis";
import { version, proposal } from "../types/display";

function ProposalSignForm({
  address,
  proposal,
  id,
  version,
  state: modalState,
  closeModal,
  threshold,
}: {
  address: string;
  proposal: { og: any; ui: proposal };
  version: version;
  threshold: number;
  id: number;
  state: boolean | undefined;
  closeModal: () => void;
}) {
  const state = useContext(AppStateContext)!;
  const dispatch = useContext(AppDispatchContext)!;
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
      <div className="flex justify-between items-center w-full md:h-12">
        <ContractLoader loading={loading}>
          {result ? (
            <div className="text-sm md:text-xl my-auto text-white font-bold flex flex-row">
              <span>Operation successful</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="w-6 h-6 ml-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            </div>
          ) : (
            <span className="text-sm md:text-xl my-auto text-white font-bold">
              Failed to sign
            </span>
          )}
          <button
            onClick={() => {
              closeModal();
            }}
            type="button"
            className=" absolute right-4 top-4 ml-4 rounded-full bg-primary p-1 md:px-2 text-white hover:text-slate-400 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="fill-white w-6 h-6"
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
      onSubmit={async (values) => {
        setLoading(true);
        try {
          await sign(id, proposal.og, modalState, values.flag);
          setResult(true);
          setLoading(false);
        } catch {
          setResult(false);
        }
        setLoading(false);
        setTimeout(() => {
          closeModal();
        }, 1500);
      }}
    >
      <Form className="flex flex-col justify-center items-center  col-span-2 h-full max-w-full">
        <div className="text-2xl font-medium  mb-2 text-white self-start">
          Review and confirm the Action below:
        </div>
        <div className="flex flex-col md:flex-col items-start mb-2 w-full max-w-full ">
          <p className="font-medium text-white text-lg">
            Raw proposal contents:
          </p>
          <code className=" overflow-y-auto  h-96 font-medium text-white border-2 border-white mb-2 mt-2 p-2 max-w-full break-words">
            {JSON.stringify(proposal.og, null, 2)}
          </code>
          <p className="font-medium text-white text-lg">
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
                <div className="flex flex-col md:flex-row items-center justify-between mb-2 w-full ">
                  <label className="font-medium text-white">
                    Try to resolve immediately?:
                  </label>
                  <Field
                    name="flag"
                    as="select"
                    className="rounded-md border-2 p-2"
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </Field>
                </div>
              ))}
        <ErrorMessage name="flag" render={renderError} />
        <div className="flex justify-between w-2/3 md:w-1/3">
          <button
            className=" bg-primary font-medium text-white my-2 p-2 hover:bg-red-500 focus:bg-red-500 hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
            onClick={(e) => {
              e.preventDefault();
              closeModal();
            }}
          >
            Cancel
          </button>
          <button
            className=" bg-primary font-medium text-white my-2 p-2 hover:bg-red-500 focus:bg-red-500 hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
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
