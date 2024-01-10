import { createContext } from "react";
import { version } from "../types/display";

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
      version?: version;
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
    version?: version;
  } | null;
  formStatus: string;
  setFormStatus: React.Dispatch<React.SetStateAction<string>>;
}>(null);

export default FormContext;
