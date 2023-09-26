import { MichelsonMap } from "@taquito/taquito";
import { BigNumber } from "bignumber.js";

type content =
  | { execute_lambda: { metadata?: string; lambda: Array<string> } }
  | { transfer: { amount: number; target: string; parameter: {} } }
  | { add_owners: string[] }
  | { remove_owners: string[] }
  | { change_threshold: number }
  | { adjust_threshold: number }
  | { execute: string }
  | { adjust_effective_period: number };

type proposal = {
  signatures: MichelsonMap<string, boolean>;
  contents: content[];
  executed: boolean;
  state:
    | { rejected: Symbol }
    | { executed: Symbol }
    | { proposing: Symbol }
    | { expired: Symbol };
  proposer: { actor: string; timestamp: string };
};

type contractStorage = {
  proposal_counter: string;
  balance: string;
  effective_period: number;
  proposals: string;
  owners: string[];
  archives: string;
  threshold: BigNumber;
  version: "0.3.1";
};
export { type content, type proposal, type contractStorage };
