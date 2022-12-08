import { ErrorMessage, Field, Form, Formik } from "formik";
import React, { useContext } from "react";
import FormContext from "../context/formContext";

function Basic() {
    const { activeStepIndex, setActiveStepIndex, formState, setFormState } =
        useContext(FormContext)!;

    const renderError = (message: string) => (
        <p className="italic text-red-600">{message}</p>
    );


    return (
        <Formik
            initialValues={{
                walletName: "example-safe",
            }}
            onSubmit={(values) => {
                const data = { ...formState, requiredSignatures: 1, ...values };
                setFormState(data);
                setActiveStepIndex(activeStepIndex + 1);
            }}
        >
            <Form className="flex flex-col justify-center items-center align-self-center justify-self-center col-span-2">
                <div className="text-2xl font-medium self-center mb-2 text-gray-800">Enter you wallet name below</div>
                <div className="flex flex-col items-start mb-2">
                    <label className="font-medium text-gray-900">Wallet name</label>
                    <Field
                        name="walletName"
                        className="rounded-md border-2 p-2"
                        placeholder="example-safe"
                    />
                </div>
                <ErrorMessage name="walletName" render={renderError} />
                <button
                    className="rounded-md bg-indigo-500 font-medium text-white my-2 p-2 hover:bg-indigo-600 focus:bg-indigo-600 hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
                    type="submit"
                >
                    Continue
                </button>
            </Form>
        </Formik >
    );
}

export default Basic;
