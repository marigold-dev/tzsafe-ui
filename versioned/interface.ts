import { Parser } from "@taquito/michel-codec";
import { Contract, TezosToolkit, WalletContract } from "@taquito/taquito";
import { validateAddress, ValidationResult } from "@taquito/utils";
import { BigNumber } from "bignumber.js";
import { contractStorage } from "../types/app";
import { proposal } from "../types/display";
import { ownersForm } from "./forms";

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
  readonly version: string;
  readonly contractAddress: string;
  constructor(version: string, contractAddress: string) {
    this.version = version;
    this.contractAddress = contractAddress;
  }
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
      c.version === "0.1.1"
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
      c.version === "0.0.11" ||
      c.version === "0.1.1"
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
      c.version === "0.0.11" ||
      c.version === "0.1.1"
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
      c.version === "0.1.1"
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
    let _: never = c.version;
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
}

export { Versioned };
