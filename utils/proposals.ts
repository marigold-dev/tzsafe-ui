export const canExecute = (
  signatures: { result: boolean }[],
  threshold: number
): boolean =>
  signatures.reduce<number[]>((acc, curr) => {
    if (curr.result) return [...acc, 1];
    return acc;
  }, []).length >= threshold;

export const canReject = (
  signatures: { result: boolean }[],
  threshold: number,
  signers: number
): boolean =>
  signatures.reduce<number[]>((acc, curr) => {
    if (!curr.result) return [...acc, 1];
    return acc;
  }, []).length >
  signers - threshold;
