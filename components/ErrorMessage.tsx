import { ErrorMessage as FormikError } from "formik";
import renderError from "./formUtils";

type props = {
  name: string;
};

const ErrorMessage = ({ name }: props) => (
  <span className="mt-1 inline-block -translate-x-2 text-transparent">
    i
    <FormikError name={name} render={renderError} />
  </span>
);

export default ErrorMessage;
