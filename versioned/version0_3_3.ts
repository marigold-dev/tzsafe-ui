import { emitMicheline, Parser } from "@taquito/michel-codec";
import {
  BigMapAbstraction,
  TezosToolkit,
  WalletContract,
  WalletOperationBatch,
} from "@taquito/taquito";
import { char2Bytes, bytes2Char } from "@taquito/utils";
import { BigNumber } from "bignumber.js";
import { fa1_2Token } from "../components/FA1_2";
import { fa2Token } from "../components/FA2Transfer";
import { DEFAULT_TIMEOUT } from "../context/config";
import {
  generateFA1_2ApproveMichelson,
  generateFA1_2TransferMichelson,
  generateFA2Michelson,
} from "../context/generateLambda";
import {
  content,
  proposal as p1,
  contractStorage as cs,
} from "../types/Proposal0_3_3";
import { contractStorage } from "../types/app";
import { proposal, proposalContent, status } from "../types/display";
import { tezToMutez } from "../utils/tez";
import { promiseWithTimeout } from "../utils/timeout";
import { ownersForm } from "./forms";
import { proposals, timeoutAndHash, Versioned } from "./interface";

class Version0_3_3 extends Versioned {
  async submitTxProposals(
    cc: WalletContract,
    t: TezosToolkit,
    proposals: proposals,
    _convertTezToMutez?: boolean,
    batch?: WalletOperationBatch
  ): Promise<[boolean, string]> {
    let batchOp = batch;

    if (batchOp === undefined) batchOp = t.wallet.batch();

    const params = cc.methodsObject.create_proposal(
      proposals.transfers.map(x => {
        switch (x.type) {
          case "transfer":
            return {
              transfer: {
                target: x.values.to,
                amount: tezToMutez(Number(x.values.amount)),
              },
            };
          case "lambda": {
            const p = new Parser();
            const michelsonCode = p.parseMichelineExpression(x.values.lambda);
            let meta = !!x.values.metadata
              ? char2Bytes(x.values.metadata)
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
            return {
              execute_lambda: {
                metadata: null,
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
                metadata: null,
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
                metadata: null,
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
                metadata: null,
                lambda: michelsonCode,
              },
            };
          }
          case "update_metadata": {
            return {
              add_or_update_metadata: {
                key: "",
                value: char2Bytes(x.values.tzip16_metadata),
              },
            };
          }
          default:
            return {};
        }
      })
    );

    batchOp.withContractCall(params);

    const op = await batchOp.send();

    const confirmationValue = await promiseWithTimeout(
      op.confirmation(),
      DEFAULT_TIMEOUT
    );

    if (confirmationValue === -1) {
      return [true, op.opHash];
    }
    return [false, op.opHash];
  }

  // ISSUE: This function gets proposal ID and retrive proposal contents from onchain storage.
  // It causes a risk that users can sign wrong proposal if reorg, please read audit report.
  // The fix should be let user confirm proposal contents and pass to this function.
  async signProposal(
    cc: WalletContract,
    t: TezosToolkit,
    proposalId: BigNumber,
    result: boolean | undefined,
    resolve: boolean,
    batch?: WalletOperationBatch
  ): Promise<timeoutAndHash> {
    const storage: { proposals: BigMapAbstraction } = await cc.storage();
    const prop: any = await storage.proposals.get(proposalId);
    let batchOp = batch;
    if (batchOp === undefined) batchOp = t.wallet.batch();

    if (typeof result !== undefined) {
      batchOp.withContractCall(
        cc.methodsObject.sign_proposal({
          agreement: result,
          proposal_id: proposalId,
          proposal_contents: prop.contents,
        })
      );
    }
    if (resolve) {
      batchOp.withContractCall(
        // resolve proposal
        cc.methodsObject.resolve_proposal({
          proposal_id: proposalId,
          proposal_contents: prop.contents,
        })
      );
    }
    const op = await batchOp.send();

    const confirmationValue = await promiseWithTimeout(
      op.confirmation(1),
      DEFAULT_TIMEOUT
    );

    return [confirmationValue === -1, op.opHash];
  }

  async submitSettingsProposals(
    cc: WalletContract,
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
    let c: cs = contract;
    return {
      balance: balance!.toString() || "0",
      proposal_map: c.proposals.toString(),
      proposal_counter: c.proposal_counter,
      effective_period: c!.effective_period,
      threshold: c!.threshold!,
      owners: c!.owners!,
      version: "0.3.3",
    };
  }
  static mapContent(content: content): proposalContent {
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
    } else if ("add_or_update_metadata" in content) {
      return {
        add_or_update_metadata: {
          key: content.add_or_update_metadata.key,
          value: content.add_or_update_metadata.value,
        },
      };
    }

    throw new Error(`unknown proposal: ${JSON.stringify(content)}`);
  }

  static override getProposalsBigmapId(_contract: cs): string {
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

export default Version0_3_3;
