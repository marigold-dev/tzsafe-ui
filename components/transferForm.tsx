import {
    ErrorMessage,
    Field,
    FieldArray,
    Form,
    Formik,
    FormikErrors,
} from "formik";
import React, { useContext, useState } from "react";
import { AppStateContext } from "../context/state";
import { validateAddress } from "@taquito/utils";
import ContractLoader from "./contractLoader";
function get(
    s: string | FormikErrors<{ to: string; amount: string }>
): boolean {
    if (typeof s == "string") {
        return false;
    } else {
        if (s.to || s.amount) {
            return s?.to?.length !== 0 && s?.amount?.length == 0;
        } else {
            return false;
        }
    }
}
function TransferForm(
    props: React.PropsWithoutRef<{ address: string; closeModal: () => void }>
) {
    const state = useContext(AppStateContext)!;
    let [loading, setLoading] = useState(false);
    let [result, setResult] = useState("");

    async function transfer(txs: { to: string; amount: number }[]) {
        let cc = await state.connection.contract.at(props.address);
        let params = cc.methods
            .create_proposal(
                txs.map((x) => ({
                    transfer: { target: x.to, amount: x.amount, parameter: {} },
                }))
            )
            .toTransferParams();
        let op = await state.connection.wallet.transfer(params).send();
        await op.confirmation(1);
    }
    if (state?.address == null) {
        return null;
    }
    if (loading && result === "") {
        return <ContractLoader loading={loading}></ContractLoader>;
    }
    if (!loading && result !== "") {
        return (
            <div className="flex justify-between items-center w-full md:h-12">
                <ContractLoader loading={loading}>
                    <span className="text-sm md:text-xl my-auto text-gray-800 font-bold">
                        {result}
                    </span>
                    <button
                        onClick={() => {
                            props.closeModal();
                        }}
                        type="button"
                        className="ml-4 rounded-full bg-indigo-600 p-1 md:px-2 text-gray-200 hover:text-white focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-6 h-6"
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
    const renderError = (message: string) => {
        return <p className="italic text-red-600">{message}</p>;
    };
    const initialProps: { transfers: { to: string; amount: number }[] } = {
        transfers: [],
    };

    return (
        <Formik
            initialValues={initialProps}
            validate={(values) => {
                const errors: { transfers: { to: string; amount: string }[] } = {
                    transfers: [],
                };
                let dedup = new Set();
                let result = values.transfers.map((x) => {
                    if (isNaN(x.amount) || x.amount == 0) {
                        return {
                            to: "",
                            amount: `invalid amount ${x}`,
                        };
                    }
                    if (dedup.has(x.to)) {
                        return {
                            to: "already included in list",
                            amount: "",
                        };
                    } else {
                        dedup.add(x.to);
                        return {
                            to: validateAddress(x.to) !== 3 ? `invalid address ${x.to}` : "",
                            amount: "",
                        };
                    }
                });
                if (result.every((x) => x.to === "" && x.amount == "")) {
                    return;
                }
                errors.transfers = result;
                return errors;
            }}
            onSubmit={async (values) => {
                setLoading(true);
                try {
                    await transfer(values.transfers);
                    setResult("Created proposal successfully");
                } catch (e) {
                    console.log(e);
                    setResult("Failed to create proposal");
                }
                setLoading(false);
            }}
        >
            {({ values, errors }) => (
                <Form className="w-full flex grow flex-col justify-center items-center align-self-center justify-self-center col-span-2">
                    <div className="text-2xl font-medium self-center mb-2 text-gray-800">
                        Add wallet participants below
                    </div>
                    <div className="grid grid-flow-row gap-4 items-start mb-2 w-full">
                        <FieldArray name="transfers">
                            {({ remove, push }) => (
                                <div className="min-w-full">
                                    {values.transfers.length > 0 &&
                                        values.transfers.map((transfer, index) => {
                                            return (
                                                <div
                                                    className="rounded-lg border-4 border-dashed border-gray-200 md:rounded-none md:border-none md:p-none p-2 flex md:flex-row flex-col justify-start items-start min-w-full"
                                                    key={index}
                                                >
                                                    <div className="flex flex-col">
                                                        <label className="text-gray-800">
                                                            Amount in Mutez
                                                        </label>
                                                        <Field
                                                            name={`transfers.${index}.amount`}
                                                            className="rounded-md border-2 p-2 text-sm md:text-md"
                                                            placeholder={transfer.amount || 0}
                                                        />
                                                        <ErrorMessage
                                                            name={`transfers.${index}.amount`}
                                                            render={renderError}
                                                        />
                                                    </div>
                                                    <div className="relative flex flex-col w-full md:w-auto md:grow justify-start">
                                                        <label
                                                            className="text-gray-800"
                                                            htmlFor={`transfers.${index}.to`}
                                                        >
                                                            Transfer to:
                                                        </label>
                                                        <Field
                                                            name={`transfers.${index}.to`}
                                                            className="w-full rounded-md border-2 p-2 text-sm md:text-md"
                                                            placeholder={transfer.to || "Destination address"}
                                                            default={transfer.to}
                                                        />
                                                        <ErrorMessage
                                                            name={`transfers.${index}.to`}
                                                            render={(x) => {
                                                                return renderError(x);
                                                            }}
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className={
                                                            (errors.transfers &&
                                                                errors.transfers[index] &&
                                                                get(errors.transfers[index])
                                                                ? "my-auto"
                                                                : "") +
                                                            " rounded-md bg-indigo-500 font-medium text-white p-1.5 md:self-end self-center justify-self-end block md:mx-auto mx-none hover:bg-indigo-600 focus:bg-indigo-600 hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
                                                        }
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            remove(index);
                                                        }}
                                                    >
                                                        Remove transfer
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    <button
                                        type="button"
                                        className="rounded-md bg-indigo-500 font-medium text-white my-2 p-2 self-center justify-self-center block mx-auto hover:bg-indigo-600 focus:bg-indigo-600 hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            push({ to: "", amount: 0 });
                                        }}
                                    >
                                        Add transfer
                                    </button>
                                </div>
                            )}
                        </FieldArray>
                    </div>
                    <div>
                        <button
                            className="rounded-md bg-indigo-500 font-medium text-white my-2 p-2 hover:bg-indigo-600 focus:bg-indigo-600 hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
                            onClick={(e) => {
                                e.preventDefault();
                                props.closeModal();
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            className="rounded-md bg-indigo-500 font-medium text-white my-2 p-2 hover:bg-indigo-600 focus:bg-indigo-600 hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
                            type="submit"
                        >
                            Submit
                        </button>
                    </div>
                </Form>
            )}
        </Formik>
    );
}

export default TransferForm;
