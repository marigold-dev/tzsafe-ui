import { Parser } from "@taquito/michel-codec";
import { unpackDataBytes } from "@taquito/michel-codec";
import { Contract, TezosToolkit, WalletContract } from "@taquito/taquito";
import { validateAddress, ValidationResult } from "@taquito/utils";
import { BigNumber } from "bignumber.js";
import { API_URL } from "../context/config";
import { proofOfEventSchema as proposalSchema_0_3_1 } from "../types/Proposal0_3_1";
import { contractStorage } from "../types/app";
import { proposal, version } from "../types/display";
import { ownersForm } from "./forms";

type proofOfEvent = {
  payload: {
    payload: string;
    challenge_id: string;
  };
};

type makeFa2MichelsonParam = {
  walletAddress: string;
  targetAddress: string;
  tokenId: number;
  amount: number;
  fa2Address: string;
};

type makeFa1_2MichelsonParam = {
  amount: number;
  fa1_2Address: string;
};

type approve = makeFa1_2MichelsonParam & {
  spenderAddress: string;
};

type transfer = makeFa1_2MichelsonParam & {
  walletAddress: string;
  targetAddress: string;
};

type makeContractExecutionParam = {
  address: string;
  entrypoint: string;
  type: string;
  amount: number;
  param: string;
};

export type timeoutAndHash = [boolean, string];

type common = {
  fields: {
    field: string;
    label: string;
    path: string;
    placeholder: string;
    kind?: "textarea" | "input-complete" | "autocomplete";
    validate: (p: string) => string | undefined;
  }[];
};
export type proposals =
  | {
      transfers: ({
        type:
          | "transfer"
          | "lambda"
          | "contract"
          | "fa1.2-transfer"
          | "fa1.2-approve";
        values: { [key: string]: string };
      } & common)[];
    }
  | {
      transfers: ({
        type: "fa2";
        values: { [key: string]: string }[];
      } & common)[];
    };

abstract class Versioned {
  readonly version: version;
  readonly contractAddress: string;
  constructor(version: version, contractAddress: string) {
    this.version = version;
    this.contractAddress = contractAddress;
  }

  abstract submitTxProposals(
    cc: Contract,
    t: TezosToolkit,
    proposals: proposals,
    convertTezToMutez?: boolean
  ): Promise<timeoutAndHash>;

  abstract submitTxProposals(
    cc: Contract,
    t: TezosToolkit,
    proposals: proposals
  ): Promise<timeoutAndHash>;

  abstract signProposal(
    cc: WalletContract,
    t: TezosToolkit,
    proposal: number,
    result: boolean | undefined,
    resolve: boolean
  ): Promise<timeoutAndHash>;

  abstract submitSettingsProposals(
    cc: Contract,
    t: TezosToolkit,
    ops: ownersForm[]
  ): Promise<timeoutAndHash>;

  static toContractState(_contract: any, _balance: BigNumber): contractStorage {
    throw new Error("not implemented!");
  }
  static getProposalsId(_contract: any): string {
    throw new Error("not implemented!");
  }
  static toProposal(_proposal: any): proposal {
    throw new Error("not implemented!");
  }

  static proposals(
    bigmapId: string
  ): Promise<Array<{ key: string; value: any }>> {
    return fetch(
      `${API_URL}/v1/bigmaps/${bigmapId}/keys?value.state.proposing=%7B%7D&active=true`
    ).then(res => res.json());
  }

  static proposalsHistory(
    c: contractStorage,
    address: string,
    bigmapId: string
  ): Promise<Array<{ key: string; value: any }>> {
    if (c.version === "0.3.1") {
      return fetch(
        `${API_URL}/v1/contracts/events?contract=${address}&tag=proof_of_event`
      )
        .then(res => res.json())
        .then((events: Array<proofOfEvent>) =>
          events.map(event => ({
            key: event.payload.challenge_id,
            value: proposalSchema_0_3_1.Execute(
              unpackDataBytes({
                bytes: event.payload.payload,
              })
            ),
          }))
        );
    } else {
      return fetch(
        `${API_URL}/v1/bigmaps/${bigmapId}/keys?value.state.in=[{"executed":{}}, {"rejected":{}}]`
      ).then(res => res.json());
    }
  }

  static signers(c: contractStorage): string[] {
    if (typeof c == "undefined") {
      return [];
    }
    if (c.version === "0.0.6") {
      return c.signers;
    } else if (
      c.version === "0.0.8" ||
      c.version === "0.0.9" ||
      c.version === "0.0.10" ||
      c.version === "0.0.11" ||
      c.version === "0.1.1" ||
      c.version === "0.3.0" ||
      c.version === "0.3.1"
    ) {
      return c.owners;
    }
    if (c.version === "unknown version") {
      return [];
    }

    throw new Error("unknown version");
  }

  static proposalCounter(c: contractStorage): BigNumber {
    if (
      c.version === "0.0.6" ||
      c.version === "0.0.8" ||
      c.version === "0.0.9" ||
      c.version === "0.0.10" ||
      c.version === "0.0.11" ||
      c.version === "0.1.1" ||
      c.version === "0.3.0" ||
      c.version === "0.3.1"
    ) {
      return c.owners;
    }
    if (c.version === "unknown version") {
      return BigNumber(0);
    }

    throw new Error("unknown version");
  }

  static lambdaForm(c: contractStorage): {
    values: { [key: string]: string };
    fields: {
      field: string;
      label: string;
      path: string;
      kind?: "textarea";
      placeholder: string;
      validate: (p: string) => string | undefined;
    }[];
  } {
    if (c.version === "0.0.6") {
      return {
        values: {
          lambda: "",
        },
        fields: [
          {
            field: "lambda",
            label: "Lambda to execute",
            kind: "textarea",
            path: ".lambda",
            placeholder: "Write your lambda here",
            validate: (x?: string) => {
              if (!x) {
                return;
              }
              const p = new Parser();
              try {
                const _ = p.parseScript(x);
              } catch {
                return "Unable to parse the lambda";
              }
            },
          },
        ],
      };
    } else if (
      c.version === "0.0.8" ||
      c.version === "0.0.9" ||
      c.version === "0.0.10" ||
      c.version === "0.0.11" ||
      c.version === "0.1.1" ||
      c.version === "0.3.0" ||
      c.version === "0.3.1"
    ) {
      return {
        values: {
          metadata: "",
          lambda: "",
        },
        fields: [
          {
            field: "metadata",
            label: "Metadata to save",
            path: ".metadata",
            placeholder: "Write your metadata here",
            validate: (x?: string) => {
              return undefined;
            },
          },
          {
            field: "lambda",
            label: "Lambda to execute",
            kind: "textarea",
            path: ".lambda",
            placeholder: "Write your lambda here",
            validate: (x?: string) => {
              if (!x) {
                return;
              }
              const p = new Parser();
              try {
                p.parseScript(x);
              } catch {
                return "Unable to parse the lambda";
              }
            },
          },
        ],
      };
    }
    if (c.version === "unknown version") {
      return { fields: [], values: {} };
    }

    throw new Error("Invalid version");
  }

  static transferForm(c: contractStorage): {
    values: { [key: string]: string };
    fields: {
      field: string;
      label: string;
      path: string;
      kind?: "input-complete";
      placeholder: string;
      validate: (p: string) => string | undefined;
    }[];
  } {
    if (c.version === "0.0.6") {
      return {
        values: {
          amount: "",
          to: "",
        },
        fields: [
          {
            field: "amount",
            label: "Amount (Tez)",
            path: ".amount",
            placeholder: "1",
            validate: (x: string) => {
              const amount = Number(x);
              if (isNaN(amount) || amount <= 0) {
                return `Invalid amount ${x}`;
              }
            },
          },
          {
            field: "to",
            label: "Transfer to",
            path: ".to",
            kind: "input-complete",
            placeholder: "Destination address",
            validate: (x: string) =>
              validateAddress(x) !== ValidationResult.VALID
                ? `Invalid address ${x}`
                : undefined,
          },
        ],
      };
    } else if (
      c.version === "0.0.8" ||
      c.version === "0.0.9" ||
      c.version === "0.0.10" ||
      c.version === "0.0.11" ||
      c.version === "0.1.1" ||
      c.version === "0.3.0" ||
      c.version === "0.3.1"
    ) {
      return {
        values: {
          amount: "",
          to: "",
        },
        fields: [
          {
            field: "amount",
            label: "Amount (Tez)",
            path: ".amount",
            placeholder: "1",
            validate: (x: string) => {
              const amount = Number(x);
              if (isNaN(amount) || amount <= 0) {
                return `Invalid amount ${x}`;
              }
            },
          },
          {
            field: "to",
            label: "Transfer to",
            path: ".to",
            kind: "input-complete",
            placeholder: "Destination address",
            validate: (x: string) =>
              validateAddress(x) !== ValidationResult.VALID
                ? `Invalid address ${x}`
                : undefined,
          },
        ],
      };
    }
    if (c.version === "unknown version") {
      return { fields: [], values: {} };
    }

    throw new Error("unknown version");
  }

  static fa2(c: contractStorage): {
    values: { [key: string]: string }[];
    fields: {
      field: string;
      label: string;
      path: string;
      kind?: "input-complete" | "autocomplete";
      placeholder: string;
      validate: (p: string) => string | undefined;
    }[];
  } {
    return {
      values: [
        {
          token: "",
          amount: "",
          targetAddress: "",
        },
      ],
      fields: [
        {
          field: "token",
          label: "Token",
          path: ".token",
          placeholder: "Token",
          validate: (x: string) => {
            return !x ? "Please select a token" : undefined;
          },
        },
        {
          field: "amount",
          label: "Amount",
          path: ".amount",
          placeholder: "1",
          validate: (x: string) => {
            const amount = Number(x);
            if (isNaN(amount) || amount <= 0 || !Number.isInteger(amount)) {
              return `Invalid amount ${x}`;
            }
          },
        },
        {
          field: "targetAddress",
          label: "Transfer to",
          path: ".targetAddress",
          kind: "input-complete",
          placeholder: "Destination address",
          validate: (x: string) =>
            validateAddress(x) !== ValidationResult.VALID
              ? `Invalid address ${x}`
              : undefined,
        },
      ],
    };
  }

  static fa1_2_approve(c: contractStorage): {
    values: { [key: string]: string };
    fields: {
      field: string;
      label: string;
      path: string;
      kind?: "input-complete" | "autocomplete";
      placeholder: string;
      validate: (p: string) => string | undefined;
    }[];
  } {
    return {
      values: {
        token: "",
        amount: "",
        targetAddress: "",
      },
      fields: [
        {
          field: "token",
          label: "Token",
          path: ".token",
          placeholder: "Token",
          validate: (x: string) => {
            return !x ? "Please select a token" : undefined;
          },
        },
        {
          field: "amount",
          label: "Amount",
          path: ".amount",
          placeholder: "1",
          validate: (x: string) => {
            const amount = Number(x);
            if (isNaN(amount) || amount < 0) {
              return `Invalid amount ${x}`;
            }
          },
        },
        {
          field: "spenderAddress",
          label: "Transfer to",
          path: ".spenderAddress",
          kind: "input-complete",
          placeholder: "Spender address",
          validate: (x: string) =>
            validateAddress(x) !== ValidationResult.VALID
              ? `Invalid address ${x}`
              : undefined,
        },
      ],
    };
  }

  static fa1_2_transfer(c: contractStorage): {
    values: { [key: string]: string };
    fields: {
      field: string;
      label: string;
      path: string;
      kind?: "input-complete" | "autocomplete";
      placeholder: string;
      validate: (p: string) => string | undefined;
    }[];
  } {
    return {
      values: {
        token: "",
        amount: "",
        targetAddress: "",
      },
      fields: [
        {
          field: "token",
          label: "Token",
          path: ".token",
          placeholder: "Token",
          validate: (x: string) => {
            return !x ? "Please select a token" : undefined;
          },
        },
        {
          field: "amount",
          label: "Amount",
          path: ".amount",
          placeholder: "1",
          validate: (x: string) => {
            const amount = Number(x);
            if (isNaN(amount) || amount <= 0) {
              return `Invalid amount ${x}`;
            }
          },
        },
        {
          field: "targetAddress",
          label: "Transfer to",
          path: ".targetAddress",
          kind: "input-complete",
          placeholder: "Destination address",
          validate: (x: string) =>
            validateAddress(x) !== ValidationResult.VALID
              ? `Invalid address ${x}`
              : undefined,
        },
      ],
    };
  }

  static generateFA2Michelson(
    version: version,
    params: makeFa2MichelsonParam[]
  ) {
    if (params.length === 0) throw new Error("Empty fa2 params");

    if (version === "0.3.1") {
      return `{
        DROP;
        NIL operation ;
        PUSH address "${params[0].fa2Address}";
        CONTRACT %transfer (list (pair (address %from_) (list %txs (pair (address %to_) (pair (nat %token_id) (nat %amount))))));
        IF_NONE { PUSH string "contract dosen't exist" ; FAILWITH } { } ;
        PUSH mutez 0 ;
        PUSH (list (pair (address %from_) (list %txs (pair (address %to_) (pair (nat %token_id) (nat %amount)))))) {Pair "${
          params[0].walletAddress
        }" {
          ${params
            .map(
              ({ targetAddress, tokenId, amount }) =>
                `Pair "${targetAddress}" (Pair ${tokenId} ${amount}) ;`
            )
            .join("\n")}
          
        } };
        TRANSFER_TOKENS ;
        CONS ;
      }`;
    } else if (version !== "unknown version") {
      return `{
        DROP;
        PUSH address "${params[0].fa2Address}";
        CONTRACT %transfer (list (pair (address %from_) (list %txs (pair (address %to_) (pair (nat %token_id) (nat %amount))))));
        IF_NONE { PUSH string "contract dosen't exist" ; FAILWITH } { } ;
        PUSH mutez 0 ;
        PUSH (list (pair (address %from_) (list %txs (pair (address %to_) (pair (nat %token_id) (nat %amount)))))) {Pair "${
          params[0].walletAddress
        }" {
          ${params
            .map(
              ({ targetAddress, tokenId, amount }) =>
                `Pair "${targetAddress}" (Pair ${tokenId} ${amount}) ;`
            )
            .join("\n")}
          
        } };
        TRANSFER_TOKENS ;
      }`;
    }

    throw new Error("Can't generate for an unknow version");
  }

  static generateFA1_2ApproveMichelson(
    version: version,
    { spenderAddress, amount, fa1_2Address }: approve
  ) {
    if (version === "0.3.1") {
      return `{ 
        DROP ;
        NIL operation ;
        PUSH address "${fa1_2Address}" ;
        CONTRACT %approve (pair (address :spender) (nat :value)) ;
        IF_NONE { PUSH string "contract dosen't exist" ; FAILWITH } { } ;
        PUSH mutez 0 ;
        PUSH (pair (address :spender) (nat :value)) (Pair "${spenderAddress}" ${amount}) ;
        TRANSFER_TOKENS ;
        CONS ;
    }`;
    } else if (version !== "unknown version") {
      return `{ 
        DROP ;
        PUSH address "${fa1_2Address}" ;
        CONTRACT %approve (pair (address :spender) (nat :value)) ;
        IF_NONE { PUSH string "contract dosen't exist" ; FAILWITH } { } ;
        PUSH mutez 0 ;
        PUSH (pair (address :spender) (nat :value)) (Pair "${spenderAddress}" ${amount}) ;
        TRANSFER_TOKENS ;
    }`;
    }

    throw new Error("Can't generate for an unknow version");
  }

  static generateFA1_2TransferMichelson(
    version: version,
    { walletAddress, targetAddress, amount, fa1_2Address }: transfer
  ) {
    if (version === "0.3.1") {
      return `{ 
          DROP ;
          NIL operation ;
          PUSH address "${fa1_2Address}" ;
          CONTRACT %transfer (pair (address :from) (pair (address :to) (nat :amount))) ;
          IF_NONE { PUSH string "contract dosen't exist" ; FAILWITH } { } ;
          PUSH mutez 0 ;
          PUSH  (pair (address :from) (pair (address :to) (nat :amount))) (Pair "${walletAddress}" (Pair "${targetAddress}" ${amount})) ;
          TRANSFER_TOKENS ;
          CONS ;
      }`;
    } else if (version !== "unknown version") {
      return `{ 
          DROP ;
          PUSH address "${fa1_2Address}" ;
          CONTRACT %transfer (pair (address :from) (pair (address :to) (nat :amount))) ;
          IF_NONE { PUSH string "contract dosen't exist" ; FAILWITH } { } ;
          PUSH mutez 0 ;
          PUSH  (pair (address :from) (pair (address :to) (nat :amount))) (Pair "${walletAddress}" (Pair "${targetAddress}" ${amount})) ;
          TRANSFER_TOKENS ;
      }`;
    }

    throw new Error("Can't generate for an unknow version");
  }

  static generateExecuteContractMichelson(
    version: version,
    { address, entrypoint, type, amount, param }: makeContractExecutionParam
  ) {
    let michelsonEntrypoint = "";
    if (entrypoint !== "default") {
      michelsonEntrypoint = `%${entrypoint}`;
    }

    if (version === "0.3.1") {
      return `{
          DROP;
          NIL operation ;
          PUSH address "${address}";
          CONTRACT ${michelsonEntrypoint} ${type};
          IF_NONE { PUSH string "contract dosen't exist"; FAILWITH } { };
          PUSH mutez ${amount};
          PUSH ${type} ${param} ;
          TRANSFER_TOKENS ;
          CONS ;
      }`;
    } else if (version !== "unknown version") {
      return `{
          DROP;
          PUSH address "${address}";
          CONTRACT ${michelsonEntrypoint} ${type};
          IF_NONE { PUSH string "contract dosen't exist"; FAILWITH } { };
          PUSH mutez ${amount};
          PUSH ${type} ${param} ;
          TRANSFER_TOKENS ;
      }`;
    }

    throw new Error("Can't generate for an unknow version");
  }

  static generateDelegateMichelson(
    version: version,
    { bakerAddress }: { bakerAddress: string }
  ) {
    if (version === "0.3.1") {
      return `{
        DROP ;
        NIL operation ;
        PUSH key_hash "${bakerAddress}" ;
        SOME ;
        SET_DELEGATE ;
        CONS ;
      }`;
    } else if (version !== "unknown version") {
      return `{
        DROP ;
        PUSH key_hash "${bakerAddress}" ;
        SOME ;
        SET_DELEGATE ;
      }`;
    }

    throw new Error("Can't generate for an unknow version");
  }

  static generateUndelegateMichelson(version: version) {
    if (version === "0.3.1") {
      return `{
        DROP ;
        NIL operation ;
        NONE key_hash ;
        SET_DELEGATE ;
        CONS ;
      }`;
    } else if (version !== "unknown version") {
      return `{
        DROP ;
        NONE key_hash ;
        SET_DELEGATE ;
      }`;
    }

    throw new Error("Can't generate for an unknow version");
  }
}

export { Versioned };
