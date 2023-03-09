import { Parser } from "@taquito/michel-codec";
import { emitMicheline } from "@taquito/michel-codec";
import {
  BigMapAbstraction,
  Contract,
  TezosToolkit,
  WalletContract,
} from "@taquito/taquito";
import { char2Bytes, bytes2Char } from "@taquito/utils";
import { BigNumber } from "bignumber.js";
import { DEFAULT_TIMEOUT } from "../context/config";
import {
  content,
  proposal as p1,
  contractStorage as c1,
} from "../types/011Proposal";
import { contractStorage } from "../types/app";
import { proposal, proposalContent, status } from "../types/display";
import { promiseWithTimeout } from "../utils/timeout";
import { matchLambda } from "./apis";
import { ownersForm } from "./forms";
import { timeoutAndHash, Versioned } from "./interface";

function convert(x: string): string {
  return char2Bytes(x);
}
class Version011 extends Versioned {
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
  ): Promise<[boolean, string]> {
    let params = cc.methods
      .create_proposal(
        proposals.transfers.map(x => {
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

    const transacValue = await promiseWithTimeout(
      op.transactionOperation(),
      DEFAULT_TIMEOUT
    );

    if (transacValue === -1) {
      return [true, op.opHash];
    }

    const confirmationValue = await promiseWithTimeout(
      op.confirmation(1),
      DEFAULT_TIMEOUT
    );

    if (confirmationValue === -1) {
      return [true, op.opHash];
    }

    return [false, op.opHash];
  }
  async signProposal(
    cc: WalletContract,
    t: TezosToolkit,
    proposal: number,
    result: boolean | undefined,
    resolve: boolean
  ): Promise<timeoutAndHash> {
    let proposals: { proposals: BigMapAbstraction } = await cc.storage();
    let prop: any = await proposals.proposals.get(BigNumber(proposal));
    let batch = t.wallet.batch();
    if (typeof result != "undefined") {
      await batch.withContractCall(
        cc.methods.sign_proposal(BigNumber(proposal), prop.contents, result)
      );
    }
    if (resolve) {
      await batch.withContractCall(
        cc.methods.resolve_proposal(BigNumber(proposal), prop.contents)
      );
    }
    let op = await batch.send();

    const confirmationValue = await promiseWithTimeout(
      op.confirmation(1),
      DEFAULT_TIMEOUT
    );

    if (confirmationValue === -1) {
      return [true, op.opHash];
    }

    return [false, op.opHash];
  }

  async submitSettingsProposals(
    cc: Contract,
    t: TezosToolkit,
    ops: ownersForm[]
  ): Promise<timeoutAndHash> {
    let content = ops
      .map(v => {
        if ("addOwners" in v) {
          return { add_owners: v.addOwners };
        } else if ("removeOwners" in v) {
          return { remove_owners: v.removeOwners };
        } else if ("changeThreshold" in v) {
          return { change_threshold: v.changeThreshold };
        } else {
          return { adjust_effective_period: v.adjustEffectivePeriod };
        }
      })
      .filter(x => !!x);

    let params = cc.methods.create_proposal(content).toTransferParams();
    let op = await t.wallet.transfer(params).send();

    const transacValue = await promiseWithTimeout(
      op.transactionOperation(),
      DEFAULT_TIMEOUT
    );

    if (transacValue === -1) {
      return [true, op.opHash];
    }

    return [false, op.opHash];
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
      effective_period: c!.effective_period,
      threshold: c!.threshold.toNumber()!,
      owners: c!.owners!,
      version: "0.0.11",
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
                      lambda: emitMicheline(
                        JSON.parse(content.execute_lambda.lambda)
                      ),
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
          content: content.execute_lambda.lambda
            ? emitMicheline(JSON.parse(content.execute_lambda.lambda || ""))
            : "",
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
    } else if ("adjust_effective_period" in content) {
      return {
        adjustEffectivePeriod: content.adjust_effective_period,
      };
    } else if ("execute" in content) {
      return { execute: content.execute };
    }
    let never: never = content;
    throw new Error("unknown proposal");
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
      expired: "Expired",
    };
    return {
      timestamp: prop.proposer.timestamp,
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

export default Version011;
