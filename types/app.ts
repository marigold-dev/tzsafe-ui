import { version } from "./display";

type contractStorage = {version: version} & {
  [key: string]: any;
  balance: string;
  threshold: number;
};
export { type contractStorage };
