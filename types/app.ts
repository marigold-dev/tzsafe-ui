import BigNumber from "bignumber.js";
import { version } from "./display";

type contractStorage = { version: version } & {
  [key: string]: any;
  proposal_counter: BigNumber;
  balance: string;
  threshold: BigNumber;
};
export { type contractStorage };
