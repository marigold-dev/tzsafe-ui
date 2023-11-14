import { emitMicheline, Parser, packDataBytes } from "@taquito/michel-codec";
import {
  BigMapAbstraction,
  Contract,
  TezosToolkit,
  WalletContract,
} from "@taquito/taquito";
import { char2Bytes, bytes2Char, num2PaddedHex } from "@taquito/utils";
import { BigNumber } from "bignumber.js";
import { fa1_2Token } from "../components/FA1_2";
import { fa2Token } from "../components/FA2Transfer";
import { DEFAULT_TIMEOUT } from "../context/config";
import {
  generateFA1_2ApproveMichelson,
  generateFA1_2TransferMichelson,
  generateFA2Michelson,
  generatePoe,
} from "../context/generateLambda";
import {
  content,
  proposal as p1,
  contractStorage as c1,
  arrayProposalSchema,
  proposalsType,
} from "../types/Proposal0_3_2";
import { contractStorage } from "../types/app";
import { proposal, proposalContent, status } from "../types/display";
import { tezToMutez } from "../utils/tez";
import { promiseWithTimeout } from "../utils/timeout";
import { ownersForm } from "./forms";
import { proposals, timeoutAndHash, Versioned } from "./interface";

function convert(x: string): string {
  return char2Bytes(x);
}

class Version0_3_2 extends Versioned {
  async submitTxProposals(
    cc: Contract,
    t: TezosToolkit,
    proposals: proposals
  ): Promise<[boolean, string]> {
    let params = cc.methods
      .create_proposal(
        proposals.transfers.map(x => {
          switch (x.type) {
            case "transfer":
              return {
                transfer: {
                  target: x.values.to,
                  amount: tezToMutez(Number(x.values.amount)),
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
            case "fa2": {
              const parser = new Parser();

              const michelsonCode = parser.parseMichelineExpression(
                generateFA2Michelson(
                  this.version,
                  x.values.map(value => {
                    const token = value.token as unknown as fa2Token;

                    return {
                      walletAddress: cc.address,
                      targetAddress: value.targetAddress,
                      tokenId: Number(value.tokenId),
                      amount: BigNumber(value.amount)
                        .multipliedBy(
                          BigNumber(10).pow(token.token.metadata.decimals)
                        )
                        .toNumber(),
                      fa2Address: value.fa2Address,
                    };
                  })
                )
              );

              return {
                execute_lambda: {
                  metadata: convert(
                    JSON.stringify({
                      contract_addr: x.values[0].targetAddress,
                      payload: x.values.map(value => ({
                        token_id: Number(value.tokenId),
                        fa2_address: value.fa2Address,
                        amount: Number(value.amount),
                      })),
                    })
                  ),
                  lambda: michelsonCode,
                },
              };
            }
            case "fa1.2-approve": {
              const parser = new Parser();

              const token = x.values.token as unknown as fa1_2Token;

              const michelsonCode = parser.parseMichelineExpression(
                generateFA1_2ApproveMichelson(this.version, {
                  spenderAddress: x.values.spenderAddress,
                  amount: BigNumber(x.values.amount)
                    .multipliedBy(
                      BigNumber(10).pow(token.token.metadata.decimals)
                    )
                    .toNumber(),
                  fa1_2Address: x.values.fa1_2Address,
                })
              );

              return {
                execute_lambda: {
                  metadata: convert(
                    JSON.stringify({
                      payload: {
                        spender_address: x.values.spenderAddress,
                        amount: x.values.amount,
                        fa1_2_address: x.values.fa1_2Address,
                        name: token.token.metadata.name,
                      },
                    })
                  ),
                  lambda: michelsonCode,
                },
              };
            }

            case "fa1.2-transfer": {
              const parser = new Parser();

              const token = x.values.token as unknown as fa1_2Token;

              const michelsonCode = parser.parseMichelineExpression(
                generateFA1_2TransferMichelson(this.version, {
                  walletAddress: cc.address,
                  amount: BigNumber(x.values.amount)
                    .multipliedBy(
                      BigNumber(10).pow(token.token.metadata.decimals)
                    )
                    .toNumber(),
                  fa1_2Address: x.values.fa1_2Address,
                  targetAddress: x.values.targetAddress,
                })
              );

              return {
                execute_lambda: {
                  metadata: convert(
                    JSON.stringify({
                      payload: {
                        amount: Number(x.values.amount),
                        fa1_2_address: x.values.fa1_2Address,
                        to: x.values.targetAddress,
                        name: token.token.metadata.name,
                      },
                    })
                  ),
                  lambda: michelsonCode,
                },
              };
            }
            case "poe":
              const parser = new Parser();

              console.log(generatePoe([x.values]));

              const michelsonCode = parser.parseMichelineExpression(
                generatePoe([x.values])
              );

              return {
                execute_lambda: {
                  metadata: convert(
                    JSON.stringify({
                      payload: x.values,
                    })
                  ),
                  lambda: michelsonCode,
                },
              };
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
    const proposals: { proposals: BigMapAbstraction } = await cc.storage();
    const proposalId = num2PaddedHex(proposal);
    const prop: any = await proposals.proposals.get(proposalId);
    const batch = t.wallet.batch();

    const proposalData = arrayProposalSchema.Encode(prop.contents);

    const proposalBytes = packDataBytes(proposalData, proposalsType).bytes;

    if (typeof result != "undefined") {
      batch.withContractCall(
        cc.methodsObject.sign_proposal({
          agreement: result,
          challenge_id: proposalId,
          payload: proposalBytes,
        })
      );
    }
    if (resolve) {
      batch.withContractCall(
        // resolve proposal
        cc.methods.proof_of_event_challenge(proposalId, proposalBytes)
      );
    }
    let op = await batch.send();

    const confirmationValue = await promiseWithTimeout(
      op.confirmation(1),
      DEFAULT_TIMEOUT
    );

    return [confirmationValue === -1, op.opHash];
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
          return { adjust_threshold: Number(v.changeThreshold) };
        } else if ("adjustEffectivePeriod" in v) {
          return { adjust_effective_period: v.adjustEffectivePeriod };
        } else {
          return v;
        }
      })
      .filter(x => !!x);

    let params = cc.methods.create_proposal(content).toTransferParams();

    let op = await t.wallet.transfer(params).send();

    const transacValue = await promiseWithTimeout(
      op.transactionOperation(),
      DEFAULT_TIMEOUT
    );

    return [transacValue === -1, op.opHash];
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
      version: "0.3.2",
    };
  }
  private static mapContent(content: content): proposalContent {
    if ("execute_lambda" in content) {
      const contentLambda = content.execute_lambda.lambda;
      const metadata = content.execute_lambda.metadata;

      const meta = !!metadata
        ? bytes2Char(typeof metadata === "string" ? metadata : metadata.Some)
        : "No meta supplied";

      const lambda = Array.isArray(contentLambda)
        ? contentLambda
        : JSON.parse(contentLambda ?? "");
      return {
        executeLambda: {
          metadata: !!lambda
            ? JSON.stringify(
                {
                  status: "Non-executed;",
                  meta,
                  lambda,
                },
                null,
                2
              )
            : JSON.stringify(
                {
                  status: "Executed; lambda unavailable",
                  meta,
                },
                null,
                2
              ),
          content: content.execute_lambda.lambda ? emitMicheline(lambda) : "",
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
    } else if ("adjust_threshold" in content) {
      return {
        changeThreshold: content.adjust_threshold,
      };
    } else if ("adjust_effective_period" in content) {
      return {
        adjustEffectivePeriod: content.adjust_effective_period,
      };
    }

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
      signatures: [
        ...(prop.signatures?.entries
          ? prop.signatures.entries()
          : Object.entries(prop.signatures)),
      ].map(([k, v]) => {
        return {
          signer: k,
          result: v,
        };
      }),
    };
  }
}

export default Version0_3_2;
