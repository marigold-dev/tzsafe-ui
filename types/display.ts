import BigNumber from "bignumber.js";

type lambda = { executeLambda: { metadata?: string; content?: string } };
type execute = { execute: string };
type transfer = { transfer: { amount: number; destination: string } };
type removeOwners = { removeOwners: string[] };
type addOwners = { addOwners: string[] };
type changeThreshold = { changeThreshold: number };
type adjustExpirationPeriod = { adjustEffectivePeriod: number };
type add_or_update_metadata = {
  add_or_update_metadata: { key: string; value: string };
};
type proposalContent =
  | changeThreshold
  | adjustExpirationPeriod
  | addOwners
  | removeOwners
  | transfer
  | execute
  | lambda
  | add_or_update_metadata;
type mutezTransfer = {
  timestamp: string;
  amount: number; //mutez
  target: {
    address: string;
  };
  parameter: object;
  initiator: {
    address: string;
  };
  sender: {
    address: string;
  };
};
export type tokenTransfer = {
  id: number;
  level: number;
  timestamp: string;
  token: {
    id: number;
    contract: {
      address: string;
    };
    tokenId: string;
    standard: string;
    totalSupply: string;
    metadata: {
      name: string;
      symbol: string;
      decimals: string;
    };
  };
  from: {
    address: string;
  };
  to: {
    address: string;
  };
  amount: number;
  transactionId: number;
};

type status = "Proposing" | "Executed" | "Rejected" | "Expired";
type proposal = {
  author: string;
  status: status;
  timestamp: string;
  resolvedBy?: string;
  signatures: { signer: string; result: boolean }[];
  content: proposalContent[];
};
type version =
  | "0.0.6"
  | "0.0.8"
  | "0.0.9"
  | "0.0.10"
  | "0.0.11"
  | "0.1.1"
  | "0.3.0"
  | "0.3.1"
  | "0.3.2"
  | "0.3.3"
  | "unknown version";

export enum TransferType {
  MUTEZ = -1,
  FA2 = -2,
  FA1_2 = -3,
  UNKNOWN = -9999,
}

export type fa2Tokens = {
  fa2_address: string | undefined;
  name: string | undefined;
  token_id: number;
  to: string | undefined;
  imageUri: string | undefined;
  amount: BigNumber;
  hasDecimal: boolean;
}[];

export type fa1_2Token = {
  fa1_2_address: string;
  name: string | undefined;
  imageUri: string | undefined;
  hasDecimal: boolean;
};

export {
  type proposal,
  type changeThreshold,
  type lambda,
  type transfer,
  type addOwners,
  type removeOwners,
  type proposalContent,
  type version,
  type mutezTransfer,
  type status,
};
