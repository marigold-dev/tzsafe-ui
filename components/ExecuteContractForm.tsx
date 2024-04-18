import { Field, useFormikContext } from "formik";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "../context/wallet";
import { tezToMutez } from "../utils/tez";
import ExecuteForm from "./ContractExecution";
import ContractLoader from "./contractLoader";
import renderError from "./formUtils";
import { state, Basic } from "./transferForm";

export function ExecuteContractForm(
  props: React.PropsWithoutRef<{
    setField: (lambda: string, metadata: string) => void;
    getFieldProps: (name: string) => { value: string };
    id: number;
    defaultState?: state;
    onReset: () => void;
    onChange: (state: state) => void;
  }>
) {
  const { submitCount, setFieldValue } = useFormikContext();
  const submitCountRef = useRef(submitCount);
  const {
    state: { userAddress },
  } = useWallet();

  const [state, setState] = useState(
    () => props.defaultState ?? { address: "", amount: 0, shape: {} }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const setLoader = useCallback((x: boolean) => setLoading(x), []);

  useEffect(() => {
    props.onChange(state);
  }, [state, props.onChange]);

  if (loading) {
    return (
      <div className="mb-2 mt-8 flex w-full items-center justify-center rounded border-2 border-white p-4 align-middle">
        <ContractLoader loading={loading}></ContractLoader>
      </div>
    );
  }

  return (
    <div className="w-full text-white">
      <p className="text-lg text-white">
        <span className="mr-2 text-zinc-500">
          #{(props.id + 1).toString().padStart(2, "0")}
        </span>
        Execute Contract
      </p>
      <Basic
        id={props.id}
        setFormState={x => setState({ ...x, shape: {} })}
        onAmountChange={amount => {
          setState({ ...state, amount: tezToMutez(Number(amount)) });
          setFieldValue(`transfers.${props.id}.amount`, amount);
        }}
        onAddressChange={address => {
          setState({ ...state, address });
        }}
        withContinue={!userAddress}
        address={userAddress}
        defaultValues={{
          amount: undefined,
          address: undefined,
        }}
      />
      {!!userAddress && (
        <ExecuteForm
          loading={loading}
          setLoading={setLoader}
          shape={state.shape}
          onShapeChange={shape => {
            setState(v => ({
              ...v,
              shape: { ...v.shape, init: shape },
            }));
          }}
          setState={shape => {
            setState(v => ({ ...v, shape }));
          }}
          reset={() => setState({ address: "", amount: 0, shape: {} })}
          address={userAddress}
          amount={state.amount}
          setField={(lambda: string, metadata: string) => {
            props.setField(lambda, metadata);
          }}
          onReset={() => {
            setState({ address: "", amount: 0, shape: {} });
            props.onReset();
          }}
        />
      )}
      <Field
        name={`transfers.${props.id}.values.lambda`}
        className="hidden"
        validate={(v: string) => {
          // This is a tricky way to detect when the submition happened
          // We want this message to show only on submit, not on every change
          if (!!v) {
            submitCountRef.current = submitCount;
            setError("");
            return;
          }

          if (submitCountRef.current === submitCount - 1) {
            setError("Please fill contract");
            submitCountRef.current += 1;
          }

          // Returning a value to prevent submition
          return true;
        }}
      />
      <Field
        name={`transfers.${props.id}.values.metadata`}
        className="hidden"
        validate={(v: string) => {
          if (!!v) return;

          // Returning a value to prevent submition
          return true;
        }}
      />
      {!!error && renderError(error)}
    </div>
  );
}
