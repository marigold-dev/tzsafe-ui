import {
  Contract,
  TezosToolkit,
  BigMapAbstraction,
  MichelsonMap,
  WalletContract,
} from "@taquito/taquito";
import { content, contractStorage as storage } from "../types/006Proposal";
import { contractStorage } from "../types/app";
import { proposal, proposalContent, status } from "../types/display";
import { ownersForm } from "./forms";
import { Versioned } from "./interface";
import { ParameterSchema } from "@taquito/michelson-encoder";
import { encodePubKey } from "@taquito/utils";
import { Parser } from "@taquito/michel-codec";
import { BigNumber } from "bignumber.js";
import { map2Object, matchLambda } from "./apis";

class Version006 extends Versioned {
  async submitTxProposals(
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
  ): Promise<void> {
    let params = cc.methods
      .create_proposal(
        proposals.transfers.map((x) => {
          switch (x.type) {
            case "transfer":
              return {
                transfer: {
                  target: x.values.to,
                  amount: x.values.amount,
                  parameter: {},
                },
              };
            case "lambda": {
              const p = new Parser();
              const michelsonCode = p.parseMichelineExpression(x.values.lambda);
              return {
                execute_lambda: michelsonCode,
              };
            }
            case "contract": {
              const p = new Parser();
              const michelsonCode = p.parseMichelineExpression(x.values.lambda);
              return {
                execute_lambda: michelsonCode,
              };
            }
            default:
              return {};
          }
        })
      )
      .toTransferParams();
    let op = await t.wallet.transfer(params).send();
    await op.transactionOperation();
    await op.confirmation(1);
  }
  static override getProposalsId(_contract: storage): string {
    return _contract.proposal_map.toString();
  }
  async signProposal(
    cc: WalletContract,
    t: TezosToolkit,
    proposal: number,
    result: boolean | undefined,
    resolve: boolean
  ): Promise<void> {
    let batch = t.wallet.batch();
    if (typeof result != "undefined") {
      await batch.withContractCall(
        cc.methods.sign_proposal_only(BigNumber(proposal), result)
      );
    }
    if (resolve) {
      await batch.withContractCall(
        cc.methods.resolve_proposal(BigNumber(proposal))
      );
    }
    let op = await batch.send();
    await op.confirmation(1);
  }

  async submitSettingsProposals(
    cc: Contract,
    t: TezosToolkit,
    ops: ownersForm[]
  ) {
    let content = ops
      .map((v) => {
        if ("addOwners" in v) {
          return { add_signers: v.addOwners };
        } else if ("removeOwners" in v) {
          return { remove_signers: v.removeOwners };
        } else if ("changeThreshold" in v) {
          return { adjust_threshold: v.changeThreshold };
        }
      })
      .filter((x) => !!x);
    let params = cc.methods.create_proposal(content).toTransferParams();
    let op = await t.wallet.transfer(params).send();
    await op.transactionOperation();
  }
  static override toContractState(
    contract: any,
    balance: BigNumber
  ): contractStorage {
    let c: {
      proposal_counter: BigNumber;
      proposal_map: BigMapAbstraction;
      signers: string[];
      threshold: BigNumber;
    } = contract;
    return {
      balance: balance!.toString() || "0",
      proposal_map: c.proposal_map.toString(),
      proposal_counter: c.proposal_counter.toString(),
      threshold: c!.threshold.toNumber()!,
      signers: c!.signers!,
      version: "0.0.6",
    };
  }
  private static mapContent(content: content): proposalContent {
    if ("execute_lambda" in content) {
      let meta = content.execute_lambda
        ? matchLambda({}, JSON.parse(content.execute_lambda))
        : null;
      return {
        executeLambda: {
          metadata: !!meta
            ? JSON.stringify(meta, null, 2)
            : JSON.stringify(
                {
                  status: "Failed to parse lambda",
                  meta: { lambda: content.execute_lambda },
                },
                null,
                2
              ),
          content: content.execute_lambda || "Lambda unavailable",
        },
      };
    } else if ("transfer" in content) {
      return {
        transfer: {
          amount: content.transfer.amount,
          destination: content.transfer.target,
        },
      };
    } else if ("add_signers" in content) {
      return {
        addOwners: content.add_signers,
      };
    } else if ("remove_signers" in content) {
      return {
        removeOwners: content.remove_signers,
      };
    } else if ("adjust_threshold" in content) {
      return {
        changeThreshold: content.adjust_threshold,
      };
    } else {
      throw new Error("should not possible!");
    }
  }

  static override toProposal(proposal: any): proposal {
    let prop: {
      signatures: MichelsonMap<string, boolean>;
      state: { active: Symbol } | { done: Symbol } | { closed: Symbol };
      content: content[];
      executed?: string;
      proposer: string;
      timestamp: string;
    } = proposal;
    const status: { [key: string]: status } = {
      active: "Proposing",
      done: "Executed",
      closed: "Rejected",
    };
    return {
      author: prop.proposer,
      status: status[Object.keys(prop.state)[0]!],
      content: prop.content.map(this.mapContent),
      signatures: [...Object.entries(prop.signatures)].map(([k, v]) => ({
        signer: k,
        result: v,
      })),
    };
  }
}

export default Version006;
