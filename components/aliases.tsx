import { ErrorMessage, Field, FieldArray, Form, Formik, FormikErrors } from "formik";
import React, { useContext } from "react";
import FormContext from "../context/formContext";
import { AppStateContext } from "../context/state";
import { validateAddress } from "@taquito/utils"
function get(s: string | FormikErrors<{ name: string; address: string; }>): boolean {
    if (typeof s == "string") {
        return false
    } else {
        if (s.address) {
            return s.address.length !== 0
        } else {
            return false
        }
    }
}
function Aliases() {
    const { activeStepIndex, setActiveStepIndex, formState, setFormState } =
        useContext(FormContext)!;
    const state = useContext(AppStateContext);
    if (state?.address == null) {
        return null;
    }
    const renderError = (message: string) => {
        return (
            <p className="italic text-red-600">{message}</p>
        )
    };
    const initialProps: { validators: { name: string, address: string }[], requiredSignatures: number } = {
        validators: [{ address: state.address!, name: state.aliases[state.address!] || "" }],
        requiredSignatures: 1

    }
    return (
        <Formik
            initialValues={initialProps}
            validate={(values) => {
                const errors: { validators: { address: string, name: string }[] } = { validators: [] };
                let dedup = new Set();
                let dedupName = new Set();

                let result = values.validators.map(x => {
                    let err = { address: "", name: "" }
                    if (dedup.has(x.address)) {
                        err.address = "already exists"
                    } else {
                        dedup.add(x.address)
                        err.address = validateAddress(x.address) !== 3 ? `invalid address ${x.address}` : ''

                    }
                    if (!!x.name && dedupName.has(x.name)) {
                        err.name = "already exists"
                    } else {
                        dedupName.add(x.name)
                    }
                    return err
                });
                if (result.every(x => x.address === '' && x.name === '')) {
                    return;
                }
                errors.validators = result
                return errors;
            }
            }
            onSubmit={(values) => {
                const data = { ...formState, ...values };
                setFormState(_ => data);
                setActiveStepIndex(activeStepIndex + 1);
            }}
        >
            {({ values, errors }) =>
                <Form className="w-full flex grow flex-col justify-center items-center align-self-center justify-self-center col-span-2">
                    <div className="text-2xl font-medium self-center mb-2 text-gray-800">Add wallet participants below</div>
                    <div className="grid grid-flow-row gap-4 items-start mb-2 w-full">
                        <FieldArray name="validators">
                            {({ remove, push }) => (
                                <div className="min-w-full">
                                    {values.validators.length > 0 && values.validators.map((validator, index) => {
                                        return (
                                            <div className="rounded-lg border-4 border-dashed border-gray-200 md:rounded-none md:border-none md:p-none p-2 flex md:flex-row flex-col justify-start items-start min-w-full" key={index}>
                                                <div className="flex flex-col">
                                                    <label className="text-gray-800">Owner Name</label>
                                                    <Field
                                                        name={`validators.${index}.name`}
                                                        className="rounded-md border-2 p-2 text-sm md:text-md"
                                                        placeholder={validator.name || "Owner Name"}
                                                    />
                                                    <ErrorMessage name={`validators.${index}.name`} render={renderError} />
                                                </div>
                                                <div className="relative flex flex-col w-full md:w-auto md:grow justify-start">
                                                    <label className="text-gray-800" htmlFor={`validators.${index}.address`}>Validator Address</label>
                                                    <Field
                                                        name={`validators.${index}.address`}
                                                        className="w-full rounded-md border-2 p-2 text-sm md:text-md"
                                                        placeholder={validator.address || "Validator address"}
                                                        default={validator.address}
                                                    />
                                                    <ErrorMessage name={`validators.${index}.address`} render={x => {
                                                        return renderError(x)
                                                    }} />
                                                </div>
                                                <button
                                                    type="button"
                                                    className={(errors.validators && errors.validators[index] && get(errors.validators[index]) ? "my-auto" : "") + " rounded-md bg-indigo-500 font-medium text-white p-1.5 md:self-end self-center justify-self-end block md:mx-auto mx-none hover:bg-indigo-600 focus:bg-indigo-600 hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"}
                                                    onClick={e => {
                                                        e.preventDefault()
                                                        remove(index)
                                                    }}
                                                >
                                                    Remove validator
                                                </button>
                                            </div>)
                                    })}
                                    <button
                                        type="button"
                                        className="rounded-md bg-indigo-500 font-medium text-white my-2 p-2 self-center justify-self-center block mx-auto hover:bg-indigo-600 focus:bg-indigo-600 hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
                                        onClick={e => {
                                            e.preventDefault()
                                            push({ name: "", address: "" })
                                        }}
                                    >
                                        Add validator
                                    </button>
                                </div>

                            )}
                        </FieldArray>
                    </div>
                    <div>
                        <Field component="select" name="requiredSignatures" values={values.requiredSignatures}>
                            {values.validators.map((_, idx) => <option key={idx + values.validators.length} label={`${idx + 1}/${values.validators.length}`} value={idx + 1}>{idx + 1}/{values.validators.length}</option>)}
                        </Field>
                    </div>
                    <button
                        className="rounded-md bg-indigo-500 font-medium text-white my-2 p-2 hover:bg-indigo-600 focus:bg-indigo-600 hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
                        type="submit"
                    >
                        Continue
                    </button>
                </Form >
            }
        </Formik >
    );
}

export default Aliases;
