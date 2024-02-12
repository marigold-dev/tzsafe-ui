import { MichelsonMap } from "@taquito/taquito";
import BigNumber from "bignumber.js";
import { daoVersion, multisigVersion } from "./display";

export type ledger = MichelsonMap<{ 0: string; 1: string }, BigNumber>;
export type token_metadata = MichelsonMap<
  BigNumber,
  { token_id: BigNumber; token_info: MichelsonMap<string, string> }
>;
export type total_supply = MichelsonMap<BigNumber, BigNumber>;
export type metadata = MichelsonMap<string, string>;

export type proposal_state =
  | { rejected: SymbolConstructor }
  | { executed: SymbolConstructor }
  | { proposing: SymbolConstructor }
  | { expired: SymbolConstructor };

export type archives = MichelsonMap<BigNumber, proposal_state>;

export type voting_option =
  | { yes: SymbolConstructor }
  | { no: SymbolConstructor }
  | { abstention: SymbolConstructor };

export type dao_content =
  | { transfer: { target: string; amount: BigNumber } }
  | { execute_lambda: { metadata?: string; lambda: string } }
  | { adjust_quorum: BigNumber }
  | { adjust_supermajority: BigNumber }
  | { adjust_voting_duration: BigNumber }
  | { adjust_execution_duration: BigNumber }
  | { adjust_token: BigNumber }
  | { add_or_update_metadata: { key: string; value: string } }
  | { remove_metadata: { key: string } }
  | { proof_of_event: string }
  | { mint: { owner: string; amount: BigNumber; token_id: BigNumber } }
  | {
      create_token: {
        token_id: BigNumber;
        token_info: MichelsonMap<string, string>;
      };
    };

export type dao_proposal = {
  state: proposal_state;
  votes: MichelsonMap<voting_option, BigNumber>;
  proposer: {
    actor: string;
    timestamp: BigNumber;
  };
  resolver?: {
    actor: string;
    timestamp: BigNumber;
  };
  content: dao_content[];
};

export type daoStorage = {
  fa2: {
    ledger: ledger;
    operators: MichelsonMap<any, any>; // skip for now
    token_metadata: token_metadata;
    metadata: MichelsonMap<string, string>;
    extension: {
      total_supply: total_supply;
      lock_table: MichelsonMap<any, any>; // skip for now
      lock_keys: [];
    };
  };
  wallet: {
    proposal_counter: BigNumber;
    proposals: MichelsonMap<BigNumber, dao_content>;
    archives: archives;
    voting_history: MichelsonMap<any, any>; // skip for now
    token: BigNumber;
    supermajority: BigNumber;
    quorum: BigNumber;
    voting_duration: BigNumber;
    execution_duration: BigNumber;
  };
  metadata: metadata;
};

export type contractStorage =
  | ({ version: multisigVersion } & {
      [key: string]: any;
      proposal_counter: BigNumber;
      balance: string;
      threshold: BigNumber;
    })
  | ({ verison: daoVersion } & daoStorage);
