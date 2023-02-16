import { tzip16 } from "@taquito/tzip16";
import { ErrorMessage, Field, Form, Formik } from "formik";
import React, { useContext, useState } from "react";
import fetchVersion from "../context/metadata";
import {
  AppDispatchContext,
  AppStateContext,
  contractStorage,
} from "../context/state";
import { toStorage } from "../versioned/apis";
import ContractLoader from "./contractLoader";

function TopUp(props: {
  address: string;
  closeModal: (contract: contractStorage) => void;
}) {
  const state = useContext(AppStateContext)!;
  const dispatch = useContext(AppDispatchContext)!;
  let [loading, setLoading] = useState(false);
  let [result, setResult] = useState<undefined | boolean>(undefined);
  const renderError = (message: string) => (
    <p className="italic text-red-600">{message}</p>
  );
  async function transfer(amount: number) {
    let op = await state.connection.wallet
      .transfer({ to: props.address, amount, mutez: false })
      .send();
    await op.transactionOperation();
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
              <span>Transfer successful</span>
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
              Failed to transfer xtz
            </span>
          )}
          <button
            onClick={() => {
              props.closeModal(state.contracts[props.address]);
            }}
            type="button"
            className=" focus:ring-offset-gray-800 absolute right-4 top-4 ml-4 rounded-full bg-primary p-1 text-white hover:text-slate-400 focus:ring-white focus:ring-offset-2 md:px-2"
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
        amount: 0,
      }}
      validate={values => {
        if (isNaN(values.amount)) {
          return { amount: `not a valid amount ${values.amount}` };
        } else {
          return;
        }
      }}
      onSubmit={async values => {
        setLoading(true);
        try {
          await transfer(values.amount);
          let c = await state.connection.contract.at(props.address, tzip16);
          let balance = await state.connection.tz.getBalance(props.address);
          let cc = await c.storage();
          let version = await fetchVersion(c);
          state.contracts[props.address]
            ? dispatch({
                type: "updateContract",
                payload: {
                  address: props.address,
                  contract: toStorage(version, cc, balance),
                },
              })
            : null;
          setResult(true);
          setLoading(false);
        } catch {
          setResult(false);
        }
        setLoading(false);
        setTimeout(() => {
          props.closeModal(state.contracts[props.address]);
        }, 1500);
      }}
    >
      <Form className="col-span-2 flex h-full flex-col  items-center justify-center">
        <div className="mb-2 self-start  text-2xl font-medium text-white">
          Enter the amount you want to transfer below:
        </div>
        <div className="mb-2 flex w-full flex-col items-center justify-between md:flex-row ">
          <label className="font-medium text-white">
            Amount of xtz to transfer
          </label>
          <Field
            name="amount"
            className="rounded-md border-2 p-2"
            placeholder="0"
          />
        </div>
        <ErrorMessage name="amount" render={renderError} />
        <div className="flex w-2/3 justify-between md:w-1/3">
          <button
            className=" hover:border-gray-800 hover:border-offset-2 hover:border-offset-gray-800 my-2 border-2 bg-primary p-2 font-medium text-white hover:bg-red-500  hover:outline-none  focus:bg-red-500"
            onClick={e => {
              e.preventDefault();
              props.closeModal(state.contracts[props.address]);
            }}
          >
            Cancel
          </button>
          <button
            className=" hover:border-gray-800 hover:border-offset-2 hover:border-offset-gray-800 my-2 border-2 bg-primary p-2 font-medium text-white hover:bg-red-500  hover:outline-none  focus:bg-red-500"
            type="submit"
          >
            Top up
          </button>
        </div>
      </Form>
    </Formik>
  );
}

export default TopUp;
