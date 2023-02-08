import { MichelsonMap } from "@taquito/taquito";
import { BigNumber } from "bignumber.js";
type content =
  | { execute_lambda: { metadata?: string; lambda: string } }
  | { transfer: { amount: BigNumber; target: string; parameter: {} } }
  | { add_owners: string[] }
  | { remove_owners: string[] }
  | { change_threshold: number }
  | { adjust_effective_period: number };

type proposal = {
  signatures: MichelsonMap<string, boolean>;
  contents: content[];
  executed: boolean;
  state: { rejected: Symbol } | { executed: Symbol } | { proposing: Symbol };
  proposer: { actor: string; timestamp: string };
  timestamp: string;
};

type contractStorage = {
  proposal_counter: string;
  balance: string;
  effective_period: number;
  proposals: string;
  owners: string[];
  threshold: BigNumber;
  version: "0.0.10";
};
export { type content, type proposal, type contractStorage };
