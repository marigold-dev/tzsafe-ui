import { validateAddress } from "@taquito/utils";
import { Formik, Form, ErrorMessage, FieldArray, Field, FormikErrors } from "formik";
import { useContext } from "react";
import Footer from "../components/footer";
import Meta from "../components/meta";
import NavBar from "../components/navbar";
import { AppDispatchContext, AppStateContext } from "../context/state";
const renderError = (message: string) => {
    return (
        <p className="italic text-red-600">{message}</p>
    )
};
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
function Home() {
    let state = useContext(AppStateContext)!
    let dispatch = useContext(AppDispatchContext)!;
    let byAddress = state.aliases
    let byName = Object.fromEntries(Object.entries(state.aliases).map(([k, v]) => ([v, k])))
    const initialProps: { validators: { name: string, address: string, initial: { name: string, address: string } }[], validatorsError?: string } = {
        validators: Object.entries(state.aliases).map(([k, v]) => ({ name: v, address: k, initial: { name: v, address: k } })),
        validatorsError: ""

    }
    return (
        <div className="relative h-full min-h-screen flex flex-col overflow-y-auto">
            <Meta title={"Address book"} />
            <NavBar />
            <div className="bg-graybg shadow">
                <div className="mx-auto  max-w-7xl py-6 px-4 sm:px-6 lg:px-8 flex justify-start">
                    <h1 className="text-white text-2xl font-extrabold">
                        Address book
                    </h1>
                </div>
            </div>
            <main className="bg-gray-100 h-full grow">
                <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8 min-h-full h-full">
                    <div className="px-4 py-6 sm:px-0 min-h-full h-full">
                        <div className="h-96 min-h-full border-4 border-dashed border-white grid-rows-auto md:grid-cols-auto md:auto-rows-max grid p-2 overflow-y-auto">
                            <Formik
                                enableReinitialize={true}
                                initialValues={initialProps}
                                validate={(values) => {
                                    const errors: { validators: { address: string, name: string }[], validatorsError?: string } = { validators: [] };
                                    if (values.validators.length < 1) {
                                        errors.validatorsError = "Should be at least one owner"
                                    }
                                    let result = values.validators.map(x => {
                                        let err = { address: "", name: "" }
                                        if (!x.address) {
                                            err.address = "Please provide an address"
                                        }
                                        if (byAddress[x.address] && x.initial.address !== x.address) {
                                            err.address = "already exists"
                                        } else {
                                            err.address = validateAddress(x.address) !== 3 ? `invalid address ${x.address}` : ''
                                        }
                                        if (!!x.name && byName[x.name] && x.initial.name !== x.name) {
                                            err.name = "already exists"
                                        }

                                        if (!x.name) {
                                            err.name = "Please provide an alias"
                                        }
                                        return err
                                    });
                                    if (result.every(x => x.address === '' && x.name === '') && typeof errors.validatorsError == 'undefined') {
                                        return;
                                    }
                                    errors.validators = result
                                    return errors;
                                }
                                }
                                onSubmit={(values) => {
                                    dispatch!({ type: "updateAliaces", payload: values.validators })

                                }}
                            >
                                {({ values, errors, validateForm, setTouched, handleReset }) =>
                                    <Form className="w-full flex grow flex-col justify-center items-center align-self-center justify-self-center col-span-2">
                                        <div className="text-2xl font-medium self-center mb-2 text-white">Modify saved Names & Addresses below</div>
                                        <div className="w-full grid gap-2 grid-rows-2 grid-flow-row md:grid-flow-col md:grid-cols-2 md:grid-rows-1 md:justify-around">
                                            <button
                                                className="bg-primary font-medium text-white my-2 p-2 w-full "
                                                onClick={handleReset}
                                            >
                                                Reset
                                            </button>
                                            <button
                                                className="bg-primary font-medium text-white my-2 p-2 w-full"
                                                type="submit"
                                            >
                                                Save
                                            </button>
                                        </div>
                                        <ErrorMessage name={`validatorsError`} render={renderError} />
                                        <div className="grid grid-flow-row gap-4 items-start mb-2 w-full">
                                            <FieldArray name="validators">
                                                {({ remove, unshift }) => (
                                                    <div>                                                      <button
                                                        type="button"
                                                        className=" bg-primary font-medium text-white my-2 p-2 self-center justify-self-center block mx-auto w-full"
                                                        onClick={e => {
                                                            e.preventDefault()
                                                            unshift({ name: "", address: "", initial: { name: "", address: "" } })
                                                        }}
                                                    >
                                                        Add name
                                                    </button>
                                                        <div className="min-w-full">
                                                            {values.validators.length > 0 && values.validators.map((validator, index) => {
                                                                return (
                                                                    <div className=" border-4 border-dashed border-white md:rounded-none md:border-none md:p-none p-2 flex md:flex-row flex-col justify-start items-start min-w-full" key={index}>
                                                                        <div className="grid grid-rows-3 grid-flow-col grid-cols-1 w-full">
                                                                            <label className="text-white">Name</label>
                                                                            <Field
                                                                                name={`validators.${index}.name`}
                                                                                className="border-2 p-2 text-sm md:text-md"
                                                                                placeholder={validator.name || "Name"}
                                                                            />
                                                                            <ErrorMessage name={`validators.${index}.name`} render={renderError} />
                                                                        </div>
                                                                        <div className="grid grid-rows-3 grid-flow-col grid-cols-1 md:grow w-full">
                                                                            <label className="text-white" htmlFor={`validators.${index}.address`}>Address</label>
                                                                            <Field
                                                                                name={`validators.${index}.address`}
                                                                                className="w-full border-2 p-2 text-sm md:text-md"
                                                                                placeholder={validator.address || "Address"}
                                                                                default={validator.address}
                                                                            />
                                                                            <ErrorMessage name={`validators.${index}.address`} render={x => {
                                                                                return renderError(x)
                                                                            }} />
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            className={(errors.validators && errors.validators[index] && get(errors.validators[index]) ? "my-auto" : "") + " bg-primary font-medium text-white p-1.5 md:self-center self-center justify-self-center block md:mx-auto mx-none "}
                                                                            onClick={async e => {
                                                                                e.preventDefault()
                                                                                setTouched({ "validatorsError": true }, true)
                                                                                validateForm()
                                                                                remove(index)
                                                                            }}
                                                                        >
                                                                            Remove
                                                                        </button>
                                                                    </div>)
                                                            })}

                                                        </div>
                                                    </div>
                                                )}

                                            </FieldArray>

                                        </div>

                                    </Form >
                                }
                            </Formik >
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}



export default Home;
