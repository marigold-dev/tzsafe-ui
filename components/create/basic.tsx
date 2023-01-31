import { ErrorMessage, Field, Form, Formik } from "formik";
import { useContext } from "react";
import FormContext from "../../context/formContext";
import { AppStateContext } from "../../context/state";

function Basic() {
    const { activeStepIndex, setActiveStepIndex, formState, setFormState } =
        useContext(FormContext)!;
    const state = useContext(AppStateContext)!

    const renderError = (message: string) => (
        <p className="italic text-red-600">{message}</p>
    );
    let byName = Object.fromEntries(Object.entries(state?.aliases || {}).map(([k, v]) => ([v, k])))


    return (
        <Formik
            initialValues={{
                walletName: "example-wallet",
            }}
            validate={values => {
                let errors: any = {}
                if (byName[values.walletName]) {
                    errors.walletName = `Contract name already taken by ${byName[values.walletName]}`
                }
                return errors
            }}
            onSubmit={(values) => {
                const data = { ...formState, requiredSignatures: 1, ...values };
                setFormState(data);
                setActiveStepIndex(activeStepIndex + 1);
            }}
        >
            <Form className="flex flex-col justify-center items-center align-self-center justify-self-center col-span-2">
                <div className="text-2xl font-medium self-center mb-2 text-white">Enter you wallet name below</div>
                <div className="flex flex-col items-start mb-2">
                    <label className="font-medium text-white">Wallet name</label>
                    <Field
                        name="walletName"
                        className=" border-2 p-2 w-full"
                        placeholder="example-wallet"
                    />
                </div>
                <ErrorMessage name="walletName" render={renderError} />
                <button
                    className="bg-primary font-medium text-white my-2 p-2  hover:outline-none "
                    type="submit"
                >
                    Continue
                </button>
            </Form>
        </Formik >
    );
}

export default Basic;
