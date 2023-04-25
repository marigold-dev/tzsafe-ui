import { Parser } from "@taquito/michel-codec";
import { Contract, TezosToolkit, WalletContract } from "@taquito/taquito";
import { validateAddress, ValidationResult } from "@taquito/utils";
import { BigNumber } from "bignumber.js";
import { contractStorage } from "../types/app";
import { proposal } from "../types/display";
import { ownersForm } from "./forms";

export type timeoutAndHash = [boolean, string];

abstract class Versioned {
  readonly version: string;
  readonly contractAddress: string;
  constructor(version: string, contractAddress: string) {
    this.version = version;
    this.contractAddress = contractAddress;
  }
  abstract submitTxProposals(
    cc: Contract,
    t: TezosToolkit,
    proposals: {
      transfers: {
        type: "transfer" | "lambda" | "contract" | "fa2";
        values: { [key: string]: string };
        fields: {
          field: string;
          label: string;
          path: string;
          placeholder: string;
          validate: (p: string) => string | undefined;
        }[];
      }[];
    }
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
      c.version === "0.0.11"
    ) {
      return c.owners;
    }
    if (c.version === "unknown version") {
      return [];
    }
    let _: never = c.version;
    throw new Error("unknown version");
  }
  static proposalCounter(c: contractStorage): BigNumber {
    if (
      c.version === "0.0.6" ||
      c.version === "0.0.8" ||
      c.version === "0.0.9" ||
      c.version === "0.0.10" ||
      c.version === "0.0.11"
    ) {
      return c.owners;
    }
    if (c.version === "unknown version") {
      return BigNumber(0);
    }
    let _: never = c.version;
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
      c.version === "0.0.11"
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
    let _: never = c.version;
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
            label: "Amount in Mutez",
            path: ".amount",
            placeholder: "1",
            validate: (x: string) => {
              const amount = Number.parseInt(x);
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
      c.version === "0.0.11"
    ) {
      return {
        values: {
          amount: "",
          to: "",
        },
        fields: [
          {
            field: "amount",
            label: "Amount in Mutez",
            path: ".amount",
            placeholder: "1",
            validate: (x: string) => {
              const amount = Number.parseInt(x);
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
    let _: never = c.version;
    throw new Error("unknown version");
  }

  static fa2(c: contractStorage): {
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
    return {
      values: {
        targetAddress: "",
        tokenId: "",
        amount: "",
        fa2Address: "",
      },
      fields: [
        {
          field: "fa2Address",
          label: "FA2 address",
          path: ".fa2Address",
          kind: "input-complete",
          placeholder: "Fa2 address",
          validate: (x: string) =>
            validateAddress(x) !== ValidationResult.VALID
              ? `Invalid address ${x}`
              : undefined,
        },
        {
          field: "tokenId",
          label: "Token Id",
          path: ".tokenId",
          placeholder: "0",
          validate: (x: string) => {
            if (isNaN(parseInt(x))) {
              return `Invalid id ${x}`;
            }
          },
        },
        {
          field: "amount",
          label: "Amount",
          path: ".amount",
          placeholder: "1",
          validate: (x: string) => {
            const amount = parseInt(x);
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
}

export { Versioned };
