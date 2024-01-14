import { Parser, unpackDataBytes, MichelsonType } from "@taquito/michel-codec";
import { Schema } from "@taquito/michelson-encoder";
import {
  TezosToolkit,
  WalletContract,
  WalletOperationBatch,
} from "@taquito/taquito";
import { validateAddress, ValidationResult } from "@taquito/utils";
import { BigNumber } from "bignumber.js";
import { TZKT_API_URL } from "../context/config";
import { proofOfEventSchema as proposalSchema_0_3_1 } from "../types/Proposal0_3_1";
import { proofOfEventSchema as proposalSchema_0_3_2 } from "../types/Proposal0_3_2";
import {
  archiveProposalSchema as proposalSchema_0_3_3,
  proposalType as proposalType_0_3_3,
} from "../types/Proposal0_3_3";
import {
  archiveProposalSchema as proposalSchema_0_3_4,
  proposalType as proposalType_0_3_4,
} from "../types/Proposal0_3_4";
import { contractStorage } from "../types/app";
import { proposal, proposalContent, version } from "../types/display";
import { ownersForm } from "./forms";
import { hasTzip27Support, hasTzip27SupportWithPoEChallenge } from "./util";

type proofOfEvent = {
  payload: {
    payload: string;
    challenge_id: string;
  };
};

type archiveProposal = {
  payload: {
    proposal: string;
    proposal_id: string;
  };
};

export type timeoutAndHash = [boolean, string];

export type p2pData = {
  appUrl: string;
  id: string;
  name: string;
  publicKey: string;
  relayServer: string;
  type: string;
  version: string;
};

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

export type transfer =
  | ({
      type: "fa1.2-transfer" | "fa1.2-approve";
      values: { [key: string]: string };
    } & common)
  | {
      type: "transfer";
      values: {
        to: string;
        amount: string;
        parameters?: { [k: string]: any };
      };
    }
  | {
      type: "lambda";
      values: {
        lambda: string;
        metadata: any;
      };
    }
  | ({
      type: "poe";
      values: {
        payload: string;
      };
    } & common)
  | ({
      type: "update_metadata";
      values: {
        tzip16_metadata: string;
      };
    } & common)
  | {
      type: "contract";
      values: {
        lambda: string;
        metadata: any;
      };
    }
  | ({
      type: "fa2";
      values: { [key: string]: string }[];
    } & common);

export type proposals = {
  transfers: transfer[];
};

abstract class Versioned {
  readonly version: version;
  readonly contractAddress: string;

  public static FETCH_COUNT = 10;

  constructor(version: version, contractAddress: string) {
    this.version = version;
    this.contractAddress = contractAddress;
  }

  abstract submitTxProposals(
    cc: WalletContract,
    t: TezosToolkit,
    proposals: proposals,
    convertTezToMutez?: boolean,
    batch?: WalletOperationBatch
  ): Promise<timeoutAndHash>;

  abstract signProposal(
    cc: WalletContract,
    t: TezosToolkit,
    proposalId: BigNumber,
    result: boolean | undefined,
    resolve: boolean,
    batch?: WalletOperationBatch
  ): Promise<timeoutAndHash>;

  abstract submitSettingsProposals(
    cc: WalletContract,
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

  static mapContent(content: any): proposalContent {
    throw new Error("not implemented!");
  }

  static proposals(
    bigmapId: string,
    offset: number
  ): Promise<Array<{ key: string; value: any }>> {
    return fetch(
      `${TZKT_API_URL}/v1/bigmaps/${bigmapId}/keys?value.state.proposing=%7B%7D&active=true&limit=${this.FETCH_COUNT}&offset=${offset}&sort.desc=id`
    ).then(res => res.json());
  }

  private static decodePoE(schema: Schema) {
    return (events: Array<proofOfEvent>) =>
      events.flatMap(event => {
        try {
          const value = schema.Execute(
            unpackDataBytes({
              bytes: event.payload.payload,
            })
          );

          return [
            {
              key: event.payload.challenge_id,
              value,
            },
          ];
        } catch (e) {
          return [];
        }
      });
  }

  private static decodeProposal(schema: Schema, proposalType: MichelsonType) {
    return (events: Array<archiveProposal>) =>
      events.flatMap(event => {
        try {
          const value = schema.Execute(
            unpackDataBytes(
              {
                bytes: event.payload.proposal,
              },
              proposalType
            )
          );

          return [
            {
              key: event.payload.proposal_id,
              value,
            },
          ];
        } catch (e) {
          return [];
        }
      });
  }

  static proposalsHistory(
    c: contractStorage,
    address: string,

    bigmapId: string,
    offset: number
  ): Promise<Array<{ key: string; value: any }>> {
    const common = `&limit=${this.FETCH_COUNT}&offset=${offset}&sort.desc=id`;
    if (
      c.version === "0.0.6" ||
      c.version === "0.0.8" ||
      c.version === "0.0.9" ||
      c.version === "0.0.10" ||
      c.version === "0.0.11" ||
      c.version === "0.1.1" ||
      c.version === "0.3.0"
    ) {
      return fetch(
        `${TZKT_API_URL}/v1/bigmaps/${bigmapId}/keys?value.state.in=[{"executed":{}}, {"rejected":{}}, {"expired": {}}]${common}`
      ).then(res => res.json());
    } else if (c.version === "0.3.1") {
      return fetch(
        `${TZKT_API_URL}/v1/contracts/events?contract=${address}&tag=proof_of_event${common}`
      )
        .then(res => res.json())
        .then(this.decodePoE(proposalSchema_0_3_1));
    } else if (c.version === "0.3.2") {
      return fetch(
        `${TZKT_API_URL}/v1/contracts/events?contract=${address}&tag=proof_of_event${common}`
      )
        .then(res => res.json())
        .then(this.decodePoE(proposalSchema_0_3_2));
    } else if (c.version === "0.3.3") {
      return fetch(
        `${TZKT_API_URL}/v1/contracts/events?contract=${address}&tag=archive_proposal${common}`
      )
        .then(res => res.json())
        .then(this.decodeProposal(proposalSchema_0_3_3, proposalType_0_3_3));
    } else if (c.version === "0.3.4") {
      return fetch(
        `${TZKT_API_URL}/v1/contracts/events?contract=${address}&tag=archive_proposal${common}`
      )
        .then(res => res.json())
        .then(this.decodeProposal(proposalSchema_0_3_4, proposalType_0_3_4));
    } else {
      throw Error("unknown version");
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
      c.version === "0.3.1" ||
      c.version === "0.3.2" ||
      c.version === "0.3.3" ||
      c.version === "0.3.4"
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
      c.version === "0.3.1" ||
      c.version === "0.3.2" ||
      c.version === "0.3.3" ||
      c.version === "0.3.4"
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
      c.version === "0.3.1" ||
      c.version === "0.3.2" ||
      c.version === "0.3.3" ||
      c.version === "0.3.4"
    ) {
      return {
        values: {
          metadata: "",
          lambda: "",
        },
        fields: [
          {
            field: "metadata",
            label: "Note to save",
            path: ".metadata",
            placeholder: "Write your note here",
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
      c.version === "0.3.1" ||
      c.version === "0.3.2" ||
      c.version === "0.3.3" ||
      c.version === "0.3.4"
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

  static poe(version: version): {
    values: { [key: string]: string };
    fields: {
      field: string;
      label: string;
      path: string;
      placeholder: string;
      validate: (p: string) => string | undefined;
    }[];
  } {
    if (!hasTzip27SupportWithPoEChallenge(version)) {
      return { fields: [], values: {} };
    }

    return {
      values: {
        payload: "",
      },
      fields: [
        {
          field: "payload",
          label: "Payload",
          path: ".payload",
          placeholder: "Payload",
          validate: (v: string) =>
            v.trim() === "" ? "Payload is empty" : undefined,
        },
      ],
    };
  }

  static update_metadata(version: version): {
    values: { [key: string]: string };
    fields: {
      field: string;
      label: string;
      path: string;
      placeholder: string;
      validate: (p: string) => string | undefined;
    }[];
  } {
    if (!hasTzip27Support(version)) {
      return { fields: [], values: {} };
    }

    return {
      values: {
        tzip16_metadata: "",
      },
      fields: [
        {
          field: "tzip16_metadata",
          label: "Metadata in TZIP16",
          path: ".tzip16_metadata",
          placeholder: "Metadata",
          validate: (v: string) =>
            v.trim() === "" ? "Metadata is empty" : undefined,
        },
      ],
    };
  }
}

export { Versioned };
