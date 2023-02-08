import { createContext } from "react";

const FormContext = createContext<null | {
  activeStepIndex: number;
  setActiveStepIndex: React.Dispatch<React.SetStateAction<number>>;
  setFormState: React.Dispatch<
    React.SetStateAction<{
      validators?: { address: string; name: string }[];
      requiredSignatures: number;
      walletName?: string;
      effectivePeriod: number;
    } | null>
  >;
  formState: {
    validators: { address: string; name: string }[];
    requiredSignatures: number;
    walletName?: string;
    walletAddress?: string;
    effectivePeriod: number;
  } | null;
  formStatus: string;
  setFormStatus: React.Dispatch<React.SetStateAction<string>>;
}>(null);

export default FormContext;
