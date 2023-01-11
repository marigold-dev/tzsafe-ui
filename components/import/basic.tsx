import { ErrorMessage, Field, Form, Formik } from "formik";
import { useContext, useEffect, useState } from "react";
import FormContext from "../../context/formContext";
import { validateAddress } from "@taquito/utils"
import { AppStateContext } from "../../context/state";
import { useSearchParams } from "next/navigation";
function Basic() {
    const { activeStepIndex, setActiveStepIndex, formState, setFormState } =
        useContext(FormContext)!;
    const state = useContext(AppStateContext)!
    let params = useSearchParams()
    const renderError = (message: string) => (
        <p className="italic text-red-600">{message}</p>
    );
    let [initialState, set] = useState({
        walletName: "example-safe",
        walletAddress: formState?.walletAddress || ""
    })
    useEffect(() => {
        if (!initialState.walletAddress && !!params.get("address")) {
            set(initial => ({ ...initial, walletAddress: params.get("address") || "" }))
        }
    }, [params, formState, initialState.walletAddress])
    return (
        <Formik
            enableReinitialize={true}
            initialValues={initialState}
            validate={async values => {
                let errors: any = {}
                if (validateAddress(values.walletAddress) !== 3) {
                    errors.walletAddress = `Invalid address ${values.walletAddress}`
                }
                let exists = await (async () => {
                    try {
                        await state.connection.contract.at(values.walletAddress)
                        return true
                    } catch (e) {
                        return false
                    }
                })();
                if (!exists) {
                    errors.walletAddress = `Contract does not exist at address ${values.walletAddress}`
                }
                if (state.contracts[values.walletAddress]) {
                    errors.walletAddress = `Contract already imported ${values.walletAddress}`
                }
                return errors
            }}
            onSubmit={async (values) => {
                const contract = await state.connection.contract.at(values.walletAddress)
                const storage: any = await contract.storage()
                const validators = storage.signers.map((x: string) => ({ address: x, name: state.aliases[x] || "" }));
                const data = { ...formState, ...values, validators, requiredSignatures: storage.threshold.toNumber() };
                setFormState(data);
                setActiveStepIndex(activeStepIndex + 1);
            }}
        >
            <Form className="flex flex-col justify-center items-center align-self-center justify-self-center col-span-2 w-full">
                <div className="text-2xl font-medium self-center mb-2 text-white">Enter imported wallet name and address below</div>
                <div className="flex flex-col w-full justify-center md:flex-row">
                    <div className="flex flex-col">
                        <div className="flex flex-col items-start mb-2">
                            <label className="font-medium text-white">Wallet name</label>
                            <Field
                                name="walletName"
                                className=" border-2 p-2"
                                placeholder="example-wallet"
                            />
                        </div>
                        <ErrorMessage name="walletName" render={renderError} />
                    </div>
                    <div className="flex flex-col w-1/2 ">
                        <div className="flex flex-col items-start mb-2 w-full">
                            <label className="font-medium text-white">Wallet address</label>
                            <Field
                                name="walletAddress"
                                className=" border-2 p-2 w-full"
                                placeholder="your wallet address"
                            />
                        </div>
                        <ErrorMessage name="walletAddress" render={renderError} />
                    </div>
                </div>
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
