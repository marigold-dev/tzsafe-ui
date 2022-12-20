import { createContext } from "react";

const FormContext = createContext<null | {
    activeStepIndex: number;
    setActiveStepIndex: React.Dispatch<React.SetStateAction<number>>;
    setFormState: React.Dispatch<React.SetStateAction<{validators?: {address: string, name: string}[], requiredSignatures: number, walletName?: string } | null>>;
    formState: {validators: {address: string, name: string}[], requiredSignatures: number, walletName?: string, walletAddress?: string } | null;
    formStatus: string
    setFormStatus: React.Dispatch<React.SetStateAction<string>>;
}>(null)

export default FormContext
