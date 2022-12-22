import { MichelsonMap } from "@taquito/taquito";

type content =
  | { execute: { amount: number; target: string; parameter: {} } }
  | { transfer: { amount: number; target: string; parameter: {} } }
  | { add_signers: string[] }
  | { remove_signers: string[] }
  | { adjust_threshold: number };
type proposal = {
  approved_signers: string[];
  content: content[];
  executed: boolean;
  number_of_signer: number;
  proposer: string;
  timestamp: string;
};
type viewProposal = {
  signatures: MichelsonMap<string,boolean>;
  state: {active: Symbol} | {done: Symbol} | {closed: Symbol}
  content: content[];
  executed?: string;
  proposer: string;
  timestamp: string;
};
export { type content, type proposal, type viewProposal };
