import { validateAddress } from "@taquito/utils";
import {
    ErrorMessage,
    Field,
    FieldArray,
    Form,
    Formik,
    FormikErrors
} from "formik";
import React, { useContext, useState } from "react";
import { AppStateContext } from "../context/state";
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
    let [result, setResult] = useState<boolean | undefined>(undefined);

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
        await op.transactionOperation()
    }
    if (state?.address == null) {
        return null;
    }
    if (loading && typeof result == "undefined") {
        return <ContractLoader loading={loading}></ContractLoader>;
    }
    if (!loading && typeof result != "undefined") {
        return (
            <div className="flex justify-between items-center w-full md:h-12">
                <ContractLoader loading={loading}>
                    <div className="text-sm md:text-xl my-auto text-white font-bold">
                        {result ? <div className="text-sm md:text-xl my-auto text-white font-bold flex flex-row">
                            <span>Created proposal successfully</span>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="w-6 h-6 ml-4">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>

                        </div> :
                            <span className="text-sm md:text-xl my-auto text-white font-bold">
                                Failed to create proposal
                            </span>
                        }
                    </div>
                    <button
                        onClick={() => {
                            props.closeModal();
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
                    setResult(true);

                } catch (e) {
                    console.log(e);
                    setResult(false);
                }
                setLoading(false);
            }}
        >
            {({ values, errors }) => (
                <Form className="w-full flex grow flex-col justify-center items-center align-self-center justify-self-center col-span-2">
                    <div className="text-2xl font-medium self-center mb-2 text-white">
                        Add transactions below
                    </div>
                    <div className="grid grid-flow-row gap-4 items-start mb-2 w-full">
                        <FieldArray name="transfers">
                            {({ remove, push }) => (
                                <div className="min-w-full">
                                    {values.transfers.length > 0 &&
                                        values.transfers.map((transfer, index) => {
                                            return (
                                                <div
                                                    className=" border-4 border-dashed border-white md:rounded-none md:border-none md:p-none p-2 flex md:flex-row flex-col justify-around items-start min-w-full"
                                                    key={index}
                                                >
                                                    <div className="flex flex-col">
                                                        <label className="text-white">
                                                            Amount in Mutez
                                                        </label>
                                                        <Field
                                                            name={`transfers.${index}.amount`}
                                                            className=" border-2 p-2 text-sm md:text-md"
                                                            placeholder={transfer.amount || 0}
                                                        />
                                                        <ErrorMessage
                                                            name={`transfers.${index}.amount`}
                                                            render={renderError}
                                                        />
                                                    </div>
                                                    <div className="relative flex flex-col w-full md:w-auto md:grow justify-start">
                                                        <label
                                                            className="text-white"
                                                            htmlFor={`transfers.${index}.to`}
                                                        >
                                                            Transfer to:
                                                        </label>
                                                        <Field
                                                            name={`transfers.${index}.to`}
                                                            className="w-full border-2 p-2 text-sm md:text-md"
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
                                                            " bg-primary hover:bg-red-500 focus:bg-red-500 font-medium text-white p-1.5 md:self-end self-center justify-self-end block md:mx-auto mx-none  hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
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
                                        className=" bg-primary hover:bg-red-500 focus:bg-red-500  font-medium text-white my-2 p-2 self-center justify-self-center block mx-auto  hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
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
                    <div className="flex flex-row md:w-1/3 justify-around">
                        <button
                            className=" bg-primary hover:bg-red-500 focus:bg-red-500 font-medium text-white my-2 p-2  hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
                            onClick={(e) => {
                                e.preventDefault();
                                props.closeModal();
                            }}
                        >
                            Cancel
                        </button>
                        {values.transfers.length > 0 && <button
                            className=" bg-primary hover:bg-red-500 focus:bg-red-500 font-medium text-white my-2 p-2  hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
                            type="submit"
                        >
                            Submit
                        </button>}
                    </div>
                </Form>
            )}
        </Formik>
    );
}

export default TransferForm;
