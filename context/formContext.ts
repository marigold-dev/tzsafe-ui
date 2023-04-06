import { createContext } from "react";

const FormContext = createContext<null | {
  activeStepIndex: number;
  setActiveStepIndex: React.Dispatch<React.SetStateAction<number>>;
  setFormState: React.Dispatch<
    React.SetStateAction<{
      validators?: { address: string; name: string }[];
      requiredSignatures: number;
      walletName?: string;
      days: string | undefined;
      hours: string | undefined;
      minutes: string | undefined;
    } | null>
  >;
  formState: {
    validators: { address: string; name: string }[];
    requiredSignatures: number;
    walletName?: string;
    walletAddress?: string;
    days: string | undefined;
    hours: string | undefined;
    minutes: string | undefined;
  } | null;
  formStatus: string;
  setFormStatus: React.Dispatch<React.SetStateAction<string>>;
}>(null);

export default FormContext;
