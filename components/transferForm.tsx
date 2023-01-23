import {
    ErrorMessage,
    Field,
    FieldArray,
    Form,
    Formik,
} from "formik";
import React, { useContext, useState } from "react";
import { AppStateContext, contractStorage } from "../context/state";
import { VersionedApi } from "../versioned/apis";
import { Versioned } from "../versioned/interface";
import ContractLoader from "./contractLoader";


function TransferForm(
    props: React.PropsWithoutRef<{ address: string; closeModal: () => void, contract: contractStorage }>
) {
    const state = useContext(AppStateContext)!;
    let [loading, setLoading] = useState(false);
    let [result, setResult] = useState<boolean | undefined>(undefined);

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
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6 ml-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
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
    const initialProps: {
        transfers: {
            type: "lambda" | "transfer"
            values: { [key: string]: string };
            fields: {
                field: string;
                label: string;
                kind?: "textarea";
                path: string;
                placeholder: string;
                validate: (p: string) => string | undefined;
            }[];
        }[]
    } = {
        transfers: [],
    };

    return (
        <Formik
            initialValues={initialProps}
            validate={(values) => {
                const errors: {
                    transfers: { values: { [key: string]: string } }[]
                } = {
                    transfers: [],
                };
                values.transfers.forEach((element, idx) => {
                    Object.entries(element.values).forEach(([labl, value]) => {
                        let field = element.fields.find(x => x.field === labl)
                        let validate = field?.placeholder !== value ? field?.validate(value) : undefined
                        if (validate) {
                            if (!errors.transfers[idx]) {
                                errors.transfers[idx] = { values: {} }
                            }
                            errors.transfers[idx].values[labl] = validate
                        }
                    })
                });
                return errors.transfers.length === 0 ? undefined : errors
            }}
            onSubmit={async (values) => {
                setLoading(true);
                try {
                    let cc = await state.connection.contract.at(props.address);

                    let versioned = VersionedApi(props.contract.version, props.address)
                    await versioned.submitTxProposals(cc, state.connection, values)
                    setResult(true);
                } catch (e) {
                    console.log(e);
                    setResult(false);
                }
                setLoading(false);
                setTimeout(() => {
                    props.closeModal()
                }, 1500)
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
                                            const withTextArea = transfer.fields.find(x => x?.kind === "textarea") ? " flex-col md:flex-col" : ""
                                            return (
                                                <div
                                                    className={withTextArea + " border-4 border-dashed border-white md:rounded-none md:border-none md:p-none p-2 flex md:flex-row flex-col  justify-around items-start min-w-full  min-h-fit h-fit"}
                                                    key={index}
                                                >
                                                    {transfer.fields.map((value, idx, arr) => {
                                                        const withTextArea = transfer.fields.find(x => x?.kind === "textarea") ? " w-full md:w-full " : ""
                                                        let width = arr.length === 1 && !transfer.fields.find(x => x?.kind === "textarea") ? " w-3/4 " : ""
                                                        let classn = (idx + 1) % 2 === 0 ? "relative flex flex-col w-full md:grow justify-start" : "flex flex-col"
                                                        return (
                                                            <div className={classn + width + withTextArea} key={idx}>
                                                                <label className="text-white">
                                                                    {value.label}
                                                                </label>
                                                                <Field
                                                                    as={value.kind}
                                                                    name={`transfers.${index}.values.${value.field}`}
                                                                    className={" border-2 p-2 text-sm md:text-md min-h-fit h-fit" + withTextArea}
                                                                    placeholder={value.placeholder}
                                                                    rows={10}
                                                                />
                                                                <ErrorMessage
                                                                    name={`transfers.${index}.values.${value.field}`}
                                                                    render={renderError}
                                                                />
                                                            </div>
                                                        )
                                                    }
                                                    )}
                                                    <button
                                                        type="button"
                                                        className={
                                                            (errors.transfers &&
                                                                errors.transfers[index]
                                                                ? "my-auto"
                                                                : "") +
                                                            " bg-primary hover:bg-red-500 focus:bg-red-500 font-medium text-white p-1.5 md:self-end self-center justify-self-end block md:mx-auto mx-none  hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
                                                        }
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            remove(index);
                                                        }}
                                                    >
                                                        Remove TX
                                                    </button>
                                                </div>
                                            )

                                        })}
                                    <div className="flex flex-col md:flex-row">
                                        <button
                                            type="button"
                                            className=" bg-primary hover:bg-red-500 focus:bg-red-500  font-medium text-white my-2 p-2 self-center justify-self-center block mx-auto  hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                push({ type: "transfer", ...Versioned.transferForm(props.contract) });
                                            }}
                                        >
                                            Add transfer
                                        </button>
                                        <button
                                            type="button"
                                            className=" bg-primary hover:bg-red-500 focus:bg-red-500  font-medium text-white my-2 p-2 self-center justify-self-center block mx-auto  hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                push({ type: "lambda", ...Versioned.lambdaForm(props.contract) });
                                            }}
                                        >
                                            Add execute lambda
                                        </button>
                                    </div>
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
        </Formik >
    );
}

export default TransferForm;
