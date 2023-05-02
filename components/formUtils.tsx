export const renderError = (message: string) => (
  <p className="mt-1 italic text-red-600">{message}</p>
);

export const renderWarning = (message: string) => (
  <p className="mt-1 italic text-yellow-600">{message}</p>
);
export default renderError;
