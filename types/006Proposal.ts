import { BigNumber } from "bignumber.js";
type content =
  | { execute_lambda?: string }
  | { transfer: { amount: BigNumber; target: string; parameter: {} } }
  | { add_signers: string[] }
  | { remove_signers: string[] }
  | { adjust_threshold: number };

type proposal = {
  approved_signers: string[];
  content: content[];
  executed: boolean;
  proposer: string;
  timestamp: string;
};

type contractStorage = {
  proposal_counter: string;
  balance: string;
  proposal_map: string;
  signers: string[];
  threshold: number;
  version: "0.0.6";
};
export { type content, type proposal, type contractStorage };
