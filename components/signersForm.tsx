import { validateAddress } from "@taquito/utils";
import {
    ErrorMessage,
    Field,
    FieldArray,
    Form,
    Formik,
    FormikErrors,
} from "formik";
import { FC, useContext, useState } from "react";
import { AppDispatchContext, AppStateContext } from "../context/state";
import { content } from "../context/types";
import ContractLoader from "./contractLoader";
function get(
    s: string | FormikErrors<{ name: string; address: string }>
): boolean {
    if (typeof s == "string") {
        return false;
    } else {
        if (s.address) {
            return s.address.length !== 0;
        } else {
            return false;
        }
    }
}

const SignersForm: FC<{ closeModal: () => void; address: string }> = (
    props
) => {
    const state = useContext(AppStateContext)!;
    let dispatch = useContext(AppDispatchContext)!

    let [loading, setLoading] = useState(false);
    let [result, setResult] = useState<undefined | boolean>(undefined);
    if (state?.address == null) {
        return null;
    }

    const renderError = (message: string) => {
        return <p className="italic text-red-600">{message}</p>;
    };
    const initialProps: {
        validators: { name: string; address: string }[];
        requiredSignatures: number;
        validatorsError?: string
    } = {
        validators: state.contracts[props.address].signers.map((x) => ({
            address: x,
            name: state.aliases[x] || "",
        })),
        requiredSignatures: state.contracts[props.address].threshold,
    };
    async function changeSettings(
        txs: { name: string; address: string }[],
        requiredSignatures: number
    ) {
        let cc = await state.connection.contract.at(props.address);
        let initialSigners = new Set(state.contracts[props.address].signers);
        let input = new Set(txs.map((x) => x.address));
        let removed = new Set(
            [...initialSigners.values()].filter((x) => !input.has(x))
        );
        let added = new Set(
            [...input.values()].filter((x) => !initialSigners.has(x))
        )
        let ops: content[] = []
        if (added.size > 0) {
            ops.push({ add_signers: [...added.values()] })
        }
        if (removed.size > 0) {
            ops.push({ remove_signers: [...removed.values()] })
        }
        if (state.contracts[props.address].threshold !== requiredSignatures) {
            ops.push({ adjust_threshold: requiredSignatures })
        }

        let params = cc.methods
            .create_proposal(ops)
            .toTransferParams();
        let op = await state.connection.wallet.transfer(params).send();
        await op.transactionOperation()
    }
    if (loading && typeof result == "undefined") {
        return <ContractLoader loading={loading}></ContractLoader>;
    }
    if (!loading && typeof result != "undefined") {
        return (
            <div className="flex justify-between items-center w-full md:h-12">
                <ContractLoader loading={loading}>
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
                            className="w-6 h-6 fill-white"
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
            enableReinitialize={true}
            initialValues={initialProps}
            validate={(values) => {
                const errors: {
                    validators: { address: string; name: string }[];
                    requiredSignatures?: any;
                    validatorsError?: string
                } = { validators: [] };
                let dedup = new Set();
                let dedupName = new Set();
                if (values.validators.length < 1) {
                    errors.validatorsError = "Should be at least one owner"
                }
                let result = values.validators.map((x) => {
                    let err = { address: "", name: "" };
                    if (dedup.has(x.address)) {
                        err.address = "already exists";
                    } else {
                        dedup.add(x.address);
                        err.address =
                            validateAddress(x.address) !== 3
                                ? `invalid address ${x.address}`
                                : "";
                    }
                    if (!!x.name && dedupName.has(x.name)) {
                        err.name = "already exists";
                    } else {
                        dedupName.add(x.name);
                    }
                    return err;
                });
                errors.validators = result;
                if (values.requiredSignatures > values.validators.length) {
                    errors.requiredSignatures = `threshold too high. required number of signatures: ${values.requiredSignatures}, total amount of signers: ${values.validators.length}`;
                }
                if (result.every((x) => x.address === "" && x.name === "") && !errors.requiredSignatures && !errors.validatorsError) {
                    return;
                }

                return errors;
            }}
            onSubmit={async (values) => {
                setLoading(true);
                try {
                    await changeSettings(values.validators, values.requiredSignatures);
                    setResult(true);
                    dispatch!({ type: "updateAliaces", payload: values.validators })
                } catch (e) {
                    console.log(e);
                    setResult(false);
                }
                setLoading(false);
            }}
        >
            {({ values, errors, setFieldTouched, setFieldValue, setTouched, validateForm }) => (
                <Form className="w-full flex grow flex-col justify-center items-center align-self-center justify-self-center h-full">
                    <div className="text-2xl font-medium self-center mb-2 text-white">
                        Change wallet participants below
                    </div>
                    <ErrorMessage name={`validatorsError`} render={renderError} />
                    <div className="grid grid-flow-row gap-4 items-start mb-2 w-full">
                        <FieldArray name="validators">
                            {({ remove, push }) => (
                                <div className="min-w-full">
                                    {values.validators.length > 0 &&
                                        values.validators.map((validator, index) => {
                                            return (
                                                <div
                                                    className=" border-4 border-dashed border-white md:rounded-none md:border-none md:p-none p-2 flex md:flex-row flex-col justify-start items-start min-w-full"
                                                    key={index}
                                                >
                                                    <div className="flex flex-col">
                                                        <label className="text-white">Owner Name</label>
                                                        <Field
                                                            name={`validators.${index}.name`}
                                                            className="border-2 p-2 text-sm md:text-md"
                                                            placeholder={validator.name || "Owner Name"}
                                                        />
                                                        <ErrorMessage
                                                            name={`validators.${index}.name`}
                                                            render={renderError}
                                                        />
                                                    </div>
                                                    <div className="relative flex flex-col w-full md:w-auto md:grow justify-start">
                                                        <label
                                                            className="text-white"
                                                            htmlFor={`validators.${index}.address`}
                                                        >
                                                            Owner Address
                                                        </label>
                                                        <Field
                                                            name={`validators.${index}.address`}
                                                            className="w-full border-2 p-2 text-sm md:text-md"
                                                            placeholder={
                                                                validator.address || "Owner address"
                                                            }
                                                            default={validator.address}
                                                        />
                                                        <ErrorMessage
                                                            name={`validators.${index}.address`}
                                                            render={(x) => {
                                                                return renderError(x);
                                                            }}
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className={
                                                            (errors.validators &&
                                                                errors.validators[index] &&
                                                                get(errors.validators[index])
                                                                ? "my-auto"
                                                                : "") +
                                                            " bg-primary font-medium text-white p-1.5 md:self-end self-center justify-self-end block md:mx-auto mx-none "
                                                        }
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            remove(index);
                                                            setTouched({ "validatorsError": true }, true)
                                                            validateForm()
                                                            if (values.requiredSignatures > values.validators.length) {
                                                                setFieldTouched("requiredSignatures", true)
                                                                values.requiredSignatures >= 2 && setFieldValue("requiredSignatures", values.requiredSignatures - 1)
                                                            }
                                                        }}
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    <button
                                        type="button"
                                        className=" bg-primary font-medium text-white my-2 p-2 self-center justify-self-center block mx-auto "
                                        onClick={(e) => {
                                            e.preventDefault();
                                            push({ name: "", address: "" });
                                        }}
                                    >
                                        Add Owner
                                    </button>
                                </div>
                            )}
                        </FieldArray>
                    </div>
                    <div className="flex flex-col w-full md:w-auto md:grow justify-center items-center ">
                        <label className="text-white mr-4">Threshold: </label>
                        <Field
                            className="w-14"
                            as="select"
                            component="select"
                            name="requiredSignatures"
                            values={values.requiredSignatures}
                        >
                            {[...Array(Math.max(values.requiredSignatures, values.validators.length)).keys()].map(idx => (
                                <option
                                    key={idx + values.validators.length}
                                    label={`${idx + 1}/${values.validators.length}`}
                                    value={idx + 1}
                                >
                                </option>
                            ))}
                        </Field>
                        <ErrorMessage
                            name={`requiredSignatures`}
                            render={(x) => {
                                return renderError(x);
                            }}
                        />
                    </div>
                    <div className="flex justify-between w-2/3 md:w-1/3">
                        <button
                            className=" bg-primary font-medium text-white my-2 p-2 hover:bg-red-500 focus:bg-red-500 hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
                            onClick={e => {
                                e.preventDefault()
                                props.closeModal()
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            className="bg-primary font-medium text-white my-2 p-2 "
                            type="submit"
                        >
                            Continue
                        </button>
                    </div>
                </Form>
            )}
        </Formik >
    );
};

export default SignersForm;
