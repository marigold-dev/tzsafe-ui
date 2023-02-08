import { BigMapAbstraction, Contract, TezosToolkit } from "@taquito/taquito";
import {
  content,
  proposal as p1,
  contractStorage as c1,
} from "../types/008Proposal";
import { contractStorage } from "../types/app";
import { proposal, proposalContent, status } from "../types/display";
import { ownersForm } from "./forms";
import { Versioned } from "./interface";
import { Parser } from "@taquito/michel-codec";
import { ParameterSchema } from "@taquito/michelson-encoder";
import { MichelsonMap } from "@taquito/taquito";
import { BigNumber } from "bignumber.js";
import { char2Bytes, bytes2Char, encodePubKey } from "@taquito/utils";
import { map2Object, matchLambda } from "./apis";
function convert(x: string): string {
  return char2Bytes(x);
}
class Version009 extends Versioned {
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
              let meta = !!x.values.metadata
                ? convert(x.values.metadata)
                : null;
              return {
                execute_lambda: {
                  metadata: meta,
                  lambda: michelsonCode,
                },
              };
            }
            case "contract": {
              const p = new Parser();
              const michelsonCode = p.parseMichelineExpression(x.values.lambda);
              let meta = !!x.values.metadata
                ? convert(x.values.metadata)
                : null;
              return {
                execute_lambda: {
                  metadata: meta,
                  lambda: michelsonCode,
                },
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
  async signProposal(
    cc: Contract,
    t: TezosToolkit,
    proposal: number,
    p: any,
    result: boolean
  ): Promise<void> {
    let proposals: { proposals: BigMapAbstraction } = await cc.storage();
    let prop: any = await proposals.proposals.get(BigNumber(proposal));
    let params = cc.methods
      .sign_and_resolve_proposal(BigNumber(proposal), prop.contents, result)
      .toTransferParams();
    let op = await t.wallet.transfer(params).send();
    await op.confirmation(1);
  }

  async submitSettingsProposals(
    cc: Contract,
    t: TezosToolkit,
    ops: ownersForm[]
  ) {
    let content = ops.map((v) => {
      if ("addOwners" in v) {
        return { add_owners: v.addOwners };
      } else if ("removeOwners" in v) {
        return { remove_owners: v.removeOwners };
      } else {
        return { change_threshold: v.changeThreshold };
      }
    });
    let params = cc.methods.create_proposal(content).toTransferParams();
    let op = await t.wallet.transfer(params).send();
    await op.transactionOperation();
  }
  static override toContractState(
    contract: any,
    balance: BigNumber
  ): contractStorage {
    let c: c1 = contract;
    return {
      balance: balance!.toString() || "0",
      proposal_map: c.proposals.toString(),
      proposal_counter: c.proposal_counter.toString(),
      threshold: c!.threshold.toNumber()!,
      owners: c!.owners!,
      version: "0.0.8",
    };
  }
  private static mapContent(content: content): proposalContent {
    if ("execute_lambda" in content) {
      let meta = matchLambda({}, JSON.parse(content.execute_lambda.lambda));
      return {
        executeLambda: {
          metadata: !!content.execute_lambda.lambda
            ? JSON.stringify(
                !!!meta
                  ? {
                      status: "Cant parse lambda",
                      meta: content.execute_lambda.metadata
                        ? bytes2Char(content.execute_lambda.metadata)
                        : "No meta supplied",
                      lambda: content.execute_lambda.lambda,
                    }
                  : meta,
                null,
                2
              )
            : JSON.stringify(
                {
                  status: "Executed; lambda unavailable",
                  meta: content.execute_lambda.metadata
                    ? bytes2Char(content.execute_lambda.metadata)
                    : "No meta supplied",
                },
                null,
                2
              ),
          content: content.execute_lambda.lambda,
        },
      };
    } else if ("transfer" in content) {
      return {
        transfer: {
          amount: content.transfer.amount,
          destination: content.transfer.target,
        },
      };
    } else if ("add_owners" in content) {
      return {
        addOwners: content.add_owners,
      };
    } else if ("remove_owners" in content) {
      return {
        removeOwners: content.remove_owners,
      };
    } else if ("change_threshold" in content) {
      return {
        changeThreshold: content.change_threshold,
      };
    } else {
      throw new Error("should not possible!");
    }
  }
  static override getProposalsId(_contract: c1): string {
    return _contract.proposals.toString();
  }
  static override toProposal(proposal: any): proposal {
    let prop: p1 = proposal;
    const status: { [key: string]: status } = {
      proposing: "Proposing",
      executed: "Executed",
      closed: "Rejected",
    };
    return {
      author: prop.proposer.actor,
      status: status[Object.keys(prop.state)[0]!],
      content: prop.contents.map(this.mapContent),
      signatures: [...Object.entries(prop.signatures)].map(([k, v]) => ({
        signer: k,
        result: v,
      })),
    };
  }
}

export default Version009;
