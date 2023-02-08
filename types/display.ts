import { BigNumber } from "bignumber.js";
type lambda = { executeLambda: { metadata?: string; content?: string } };
type transfer = { transfer: { amount: BigNumber; destination: string } };
type removeOwners = { removeOwners: string[] };
type addOwners = { addOwners: string[] };
type changeThreshold = { changeThreshold: number };
type adjustExpirationPeriod = { adjustEffectivePeriod: number };
type proposalContent =
  | changeThreshold
  | adjustExpirationPeriod
  | addOwners
  | removeOwners
  | transfer
  | lambda;
type status = "Proposing" | "Executed" | "Rejected" | "Expired";
type proposal = {
  author: string;
  status: status;
  resolvedBy?: string;
  signatures: { signer: string; result: boolean }[];
  content: proposalContent[];
};
type version = "0.0.6" | "0.0.8" | "0.0.9" | "0.0.10" | "unknown version";
export {
  type proposal,
  type changeThreshold,
  type lambda,
  type transfer,
  type addOwners,
  type removeOwners,
  type proposalContent,
  type version,
  type status,
};
