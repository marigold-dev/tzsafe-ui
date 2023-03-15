import { Parser } from "@taquito/michel-codec";
import { Contract, TezosToolkit, WalletContract } from "@taquito/taquito";
import { validateAddress } from "@taquito/utils";
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
        type: "transfer" | "lambda" | "contract";
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
                return "Bad lambda";
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
                const _ = p.parseScript(x);
              } catch {
                return "Bad lambda";
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
    throw new Error("invalid version");
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
          amount: "0",
          to: "",
        },
        fields: [
          {
            field: "amount",
            label: "Amount in Mutez",
            path: ".amount",
            placeholder: "0",
            validate: (x: string) => {
              const amount = Number.parseInt(x);
              if (isNaN(amount) || amount <= 0) {
                return `invalid amount ${x}`;
              }
              return undefined;
            },
          },
          {
            field: "to",
            label: "Transfer to",
            path: ".to",
            kind: "input-complete",
            placeholder: "destination address",
            validate: (x: string) => {
              return validateAddress(x) !== 3
                ? `invalid address ${x}`
                : undefined;
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
          amount: "0",
          to: "",
        },
        fields: [
          {
            field: "amount",
            label: "Amount in Mutez",
            path: ".amount",
            placeholder: "0",
            validate: (x: string) => {
              const amount = Number.parseInt(x);
              if (isNaN(amount) || amount <= 0) {
                return `invalid amount ${x}`;
              }
              return undefined;
            },
          },
          {
            field: "to",
            label: "Transfer to",
            path: ".to",
            kind: "input-complete",
            placeholder: "destination address",
            validate: (x: string) => {
              return validateAddress(x) !== 3
                ? `invalid address ${x}`
                : undefined;
            },
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
}

export { Versioned };
