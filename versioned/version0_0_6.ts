import { Parser } from "@taquito/michel-codec";
import {
  TezosToolkit,
  BigMapAbstraction,
  MichelsonMap,
  WalletContract,
  WalletOperationBatch,
} from "@taquito/taquito";
import { BigNumber } from "bignumber.js";
import { DEFAULT_TIMEOUT } from "../context/config";
import { generateFA2Michelson } from "../context/generateLambda";
import { content, contractStorage as storage } from "../types/Proposal0_0_6";
import { contractStorage } from "../types/app";
import { proposal, proposalContent, status } from "../types/display";
import { promiseWithTimeout } from "../utils/timeout";
import { matchLambda, toStorage } from "./apis";
import { ownersForm } from "./forms";
import { timeoutAndHash, Versioned, transfer } from "./interface";
import { proposals } from "./interface";

class Version0_0_6 extends Versioned {
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
    // Avoid unused variable
    let _ = convertTezToMutez;

    let batchOp = batch;

    if (batchOp === undefined) batchOp = t.wallet.batch();

    const content = proposals.transfers
      .map(x => this.mapTransfer(x, cc))
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
  static override getProposalsBigmapId(_contract: storage): string {
    return _contract.proposal_map.toString();
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
    let _ = proposalContent;
    let batchOp = batch;
    if (batchOp === undefined) batchOp = t.wallet.batch();
    if (typeof result != "undefined") {
      batchOp.withContractCall(
        cc.methods.sign_proposal_only(proposalId, result)
      );
    }
    if (resolve) {
      batchOp.withContractCall(cc.methods.resolve_proposal(proposalId));
    }
    let op = await batchOp.send();

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
          return { add_signers: v.addOwners };
        } else if ("removeOwners" in v) {
          return { remove_signers: v.removeOwners };
        } else if ("changeThreshold" in v) {
          return { adjust_threshold: v.changeThreshold };
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
    let c: {
      proposal_counter: BigNumber;
      proposal_map: BigMapAbstraction;
      signers: string[];
      threshold: BigNumber;
    } = contract;
    return {
      balance: balance!.toString() || "0",
      proposal_map: c.proposal_map.toString(),
      proposal_counter: c.proposal_counter,
      threshold: c!.threshold!,
      signers: c!.signers!,
      version: "0.0.6",
    };
  }

  mapTransfer(transfer: transfer, cc: WalletContract): any {
    switch (transfer.type) {
      case "transfer":
        return {
          transfer: {
            target: transfer.values.to,
            amount: transfer.values.amount,
            parameter: {},
          },
        };
      case "lambda": {
        const p = new Parser();
        const michelsonCode = p.parseMichelineExpression(
          transfer.values.lambda
        );
        return {
          execute_lambda: michelsonCode,
        };
      }
      case "contract": {
        const p = new Parser();
        const michelsonCode = p.parseMichelineExpression(
          transfer.values.lambda
        );
        return {
          execute_lambda: michelsonCode,
        };
      }
      case "fa2": {
        const parser = new Parser();

        const michelsonCode = parser.parseMichelineExpression(
          generateFA2Michelson(
            this.version,
            transfer.values.map(value => ({
              walletAddress: cc.address,
              targetAddress: value.targetAddress,
              tokenId: Number(value.tokenId),
              amount: Number(value.amount),
              fa2Address: value.fa2Address,
            }))
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
                })),
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
    } else if ("execute" in content) {
      return { execute: content.execute };
    }
    let never: never = content;
    throw new Error("unknown proposal");
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
      timestamp: prop.timestamp,
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

export default Version0_0_6;
function convert(arg0: string): any {
  throw new Error("Function not implemented.");
}
