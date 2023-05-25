import { ErrorMessage as FormikError, useField } from "formik";
import renderError from "./formUtils";

type props = {
  name: string;
};

const ErrorMessage = ({ name }: props) => {
  const [_, { error, touched }, __] = useField(name);

  return (
    <span className="mt-1 inline-block break-words text-transparent">
      {(!error || !touched) && "i"}

      {touched && renderError(error, false, true)}
    </span>
  );
};

export default ErrorMessage;
