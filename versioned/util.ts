import { version } from "../types/display";

export function hasTzip27Support(version: version): boolean {
  const [_, middle, end] = version.split(".");

  const parsedMiddle = parseInt(middle);
  const parsedEnd = parseInt(end);

  if (isNaN(parsedMiddle) || isNaN(parsedEnd)) return false;

  // We accept 0.3.3 and above
  return parsedMiddle === 3 ? parsedEnd >= 3 : parsedMiddle >= 4;
}

export function isLambdaReturnedListOperation(version: version): boolean {
  const [_, middle, end] = version.split(".");

  const parsedMiddle = parseInt(middle);
  const parsedEnd = parseInt(end);

  if (isNaN(parsedMiddle) || isNaN(parsedEnd)) return false;

  // We accept 0.3.1 and above
  return parsedMiddle === 3 ? parsedEnd >= 1 : parsedMiddle >= 4;
}
