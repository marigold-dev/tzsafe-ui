import { Contract, TezosToolkit } from "@taquito/taquito";
import { contractStorage } from "../types/app";
import { BigNumber } from "bignumber.js";
import { proposal } from "../types/display";
import { ownersForm } from "./forms";
import { validateAddress } from "@taquito/utils";
import { Parser } from "@taquito/michel-codec";

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
        type: "transfer" | "lambda";
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
  ): {};
  abstract signProposal(
    cc: Contract,
    t: TezosToolkit,
    proposal: number,
    p: any,
    result: boolean
  ): Promise<void>;

  abstract submitSettingsProposals(
    cc: Contract,
    t: TezosToolkit,
    ops: ownersForm[]
  ): Promise<void>;
  static toContractState(_contract: any, _balance: BigNumber): contractStorage {
    throw new Error("not implemented!");
  }
  static toProposal(_proposal: any): proposal {
    throw new Error("not implemented!");
  }
  static signers(c: contractStorage): string[] {
    if (typeof c == "undefined") {
      return [];
    }
    switch (c.version) {
      case "0.0.6":
        return c.signers;
      case "0.0.8":
        return c.owners;
      default:
        return [];
    }
  }
  static proposalCounter(c: contractStorage): BigNumber {
    switch (c.version) {
      case "0.0.6":
        return BigNumber(c.proposal_counter);
      case "0.0.8":
        return BigNumber(c.proposal_counter);
      default:
        return BigNumber(0);
    }
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
    switch (c.version) {
      case "0.0.6":
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
      case "0.0.8":
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
      default:
        return { fields: [], values: {} };
    }
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
    switch (c.version) {
      case "0.0.6":
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
              label: "Transfer to:",
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
      case "0.0.8":
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
              label: "Transfer to:",
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
      default:
        return { fields: [], values: {} };
    }
  }
}

export { Versioned };
