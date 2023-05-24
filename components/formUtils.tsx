export const renderError = (
  message: string | undefined,
  withMargin: boolean = false,
  asSpan: boolean = false
) =>
  asSpan ? (
    <span
      className={`${withMargin ? "mt-1" : ""} italic ${
        !message ? "text-transparent" : "text-red-600"
      }`}
    >
      {!message ? "a" : message}
    </span>
  ) : (
    <p
      className={`${withMargin ? "mt-1" : ""} inline-block italic ${
        !message ? "text-transparent" : "text-red-600"
      }`}
    >
      {!message ? "a" : message}
    </p>
  );

export const renderWarning = (message: string) => (
  <p className="mt-1 italic text-yellow-600">{message}</p>
);
export default renderError;
