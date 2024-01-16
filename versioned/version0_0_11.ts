import { Parser } from "@taquito/michel-codec";
import { emitMicheline } from "@taquito/michel-codec";
import { PreapplyParams } from "@taquito/rpc";
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
  contractStorage as c1,
} from "../types/Proposal0_0_11";
import { contractStorage } from "../types/app";
import { proposal, proposalContent, status } from "../types/display";
import { tezToMutez } from "../utils/tez";
import { promiseWithTimeout } from "../utils/timeout";
import { toStorage } from "./apis";
import { ownersForm } from "./forms";
import { proposals, timeoutAndHash, Versioned, transfer } from "./interface";

function convert(x: string): string {
  return char2Bytes(x);
}
class Version0_0_11 extends Versioned {
  async generateSpoeOps(
    _payload: string,
    _cc: WalletContract,
    _t: TezosToolkit
  ): Promise<PreapplyParams> {
    throw new Error("Not supported");
  }
  async submitTxProposals(
    cc: WalletContract,
    t: TezosToolkit,
    proposals: proposals,
    convertTezToMutez: boolean = true,
    batch?: WalletOperationBatch,
    isSigning: boolean = false,
    isResolving: boolean = false,
    proposalIdOffset: BigNumber = BigNumber(1)
  ): Promise<[boolean, string]> {
    let batchOp = batch;

    if (batchOp === undefined) batchOp = t.wallet.batch();

    const content = proposals.transfers
      .map(x => this.mapTransfer(x, cc, convertTezToMutez))
      .filter(v => Object.keys(v).length !== 0);

    if (content.length > 0) {
      const params = cc.methodsObject.create_proposal(content);
      batchOp.withContractCall(params);

      if (isSigning) {
        const storage = toStorage(
          this.version,
          await cc.storage(),
          BigNumber(0)
        );
        const proposalId = storage.proposal_counter.plus(proposalIdOffset);
        return await this.signProposal(
          cc,
          t,
          proposalId,
          true,
          isResolving,
          batchOp,
          content
        );
      }
    }

    const op = await batchOp.send();
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
    proposalId: BigNumber,
    result: boolean | undefined,
    resolve: boolean,
    batch?: WalletOperationBatch,
    proposalContent?: any
  ): Promise<timeoutAndHash> {
    const storage: { proposals: BigMapAbstraction } = await cc.storage();
    if (!proposalContent) {
      const prop: any = await storage.proposals.get(proposalId);
      proposalContent = prop.contents;
    }
    let batchOp = batch;
    if (batchOp === undefined) batchOp = t.wallet.batch();
    if (typeof result != "undefined") {
      batchOp.withContractCall(
        cc.methods.sign_proposal(BigNumber(proposalId), proposalContent, result)
      );
    }
    if (resolve) {
      batchOp.withContractCall(
        cc.methods.resolve_proposal(BigNumber(proposalId), proposalContent)
      );
    }
    let op = await batchOp.send();

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
      proposal_counter: c.proposal_counter,
      effective_period: c!.effective_period,
      threshold: c!.threshold!,
      owners: c!.owners!,
      version: "0.0.11",
    };
  }

  mapTransfer(
    transfer: transfer,
    cc: WalletContract,
    convertTezToMutez: boolean = true
  ) {
    switch (transfer.type) {
      case "transfer":
        return {
          transfer: {
            target: transfer.values.to,
            amount: convertTezToMutez
              ? tezToMutez(Number(transfer.values.amount))
              : Number(transfer.values.amount),
            parameter: transfer.values.parameters ?? {},
          },
        };
      case "lambda": {
        const p = new Parser();
        const michelsonCode = p.parseMichelineExpression(
          transfer.values.lambda
        );
        let meta = !!transfer.values.metadata
          ? convert(transfer.values.metadata)
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
        const michelsonCode = p.parseMichelineExpression(
          transfer.values.lambda
        );
        let meta = !!transfer.values.metadata
          ? convert(transfer.values.metadata)
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
            transfer.values.map(value => {
              const token = value.token as unknown as fa2Token;

              return {
                walletAddress: cc.address,
                targetAddress: value.targetAddress,
                tokenId: Number(value.tokenId),
                amount: BigNumber(value.amount)
                  .multipliedBy(
                    BigNumber(10).pow(token.token.metadata?.decimals ?? 0)
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
                contract_addr: transfer.values[0].targetAddress,
                payload: transfer.values.map(value => ({
                  token_id: Number(value.tokenId),
                  fa2_address: value.fa2Address,
                  amount: Number(value.amount),
                  name:
                    (value.token as unknown as fa2Token).token.metadata?.name ??
                    "No name",
                })),
              })
            ),
            lambda: michelsonCode,
          },
        };
      }
      case "fa1.2-approve": {
        const parser = new Parser();

        const token = transfer.values.token as unknown as fa1_2Token;

        const michelsonCode = parser.parseMichelineExpression(
          generateFA1_2ApproveMichelson(this.version, {
            spenderAddress: transfer.values.spenderAddress,
            amount: BigNumber(transfer.values.amount)
              .multipliedBy(
                BigNumber(10).pow(token.token.metadata?.decimals ?? 0)
              )
              .toNumber(),
            fa1_2Address: transfer.values.fa1_2Address,
          })
        );

        return {
          execute_lambda: {
            metadata: convert(
              JSON.stringify({
                payload: {
                  spender_address: transfer.values.spenderAddress,
                  amount: transfer.values.amount,
                  fa1_2_address: transfer.values.fa1_2Address,
                  name: token.token.metadata?.name ?? "No name",
                },
              })
            ),
            lambda: michelsonCode,
          },
        };
      }

      case "fa1.2-transfer": {
        const parser = new Parser();

        const token = transfer.values.token as unknown as fa1_2Token;

        const michelsonCode = parser.parseMichelineExpression(
          generateFA1_2TransferMichelson(this.version, {
            walletAddress: cc.address,
            amount: BigNumber(transfer.values.amount)
              .multipliedBy(
                BigNumber(10).pow(token.token.metadata?.decimals ?? 0)
              )
              .toNumber(),
            fa1_2Address: transfer.values.fa1_2Address,
            targetAddress: transfer.values.targetAddress,
          })
        );

        return {
          execute_lambda: {
            metadata: convert(
              JSON.stringify({
                payload: {
                  amount: Number(transfer.values.amount),
                  fa1_2_address: transfer.values.fa1_2Address,
                  to: transfer.values.targetAddress,
                  name: token.token.metadata?.name ?? "No name",
                },
              })
            ),
            lambda: michelsonCode,
          },
        };
      }
      default:
        return {};
    }
  }

  static mapContent(content: content): proposalContent {
    if ("execute_lambda" in content) {
      return {
        executeLambda: {
          metadata: !!content.execute_lambda.lambda
            ? JSON.stringify(
                {
                  status: "Non-executed;",
                  meta: content.execute_lambda.metadata
                    ? bytes2Char(content.execute_lambda.metadata)
                    : "No meta supplied",
                  lambda: emitMicheline(
                    JSON.parse(content.execute_lambda.lambda)
                  ),
                },
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
    } else if ("adjust_threshold" in content) {
      return {
        changeThreshold: content.adjust_threshold,
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
  static override getProposalsBigmapId(_contract: c1): string {
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

export default Version0_0_11;
