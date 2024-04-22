import { emitMicheline } from "@taquito/michel-codec";
import {
  WalletContract,
  TezosToolkit,
  WalletOperationBatch,
  OpKind,
} from "@taquito/taquito";
import { stringToBytes, bytesToString } from "@taquito/utils";
import { BigNumber } from "bignumber.js";
import { content, contractStorage as c1 } from "../types/Proposal0_3_4";
import { contractStorage } from "../types/app";
import { proposalContent } from "../types/display";
import { toStorage } from "./apis";
import { proposals } from "./interface";
import Version0_3_3 from "./version0_3_3";

class Version0_3_4 extends Version0_3_3 {
  async generateSpoeOps(payload: string, cc: WalletContract, t: TezosToolkit) {
    const storage = toStorage(this.version, await cc.storage(), BigNumber(0));
    const proposal_id = storage.proposal_counter.plus(1);
    const encodedPayload = stringToBytes(payload);

    const ops = [
      cc.methodsObject
        .proof_of_event_challenge(encodedPayload)
        .toTransferParams(),
      cc.methodsObject
        .sign_proposal({
          agreement: true,
          proposal_id,
          proposal_contents: [{ proof_of_event: encodedPayload }],
        })
        .toTransferParams(),
      cc.methodsObject
        .resolve_proposal({
          proposal_id,
          proposal_contents: [{ proof_of_event: encodedPayload }],
        })
        .toTransferParams(),
    ];

    const batch = await t.prepare.batch(
      ops.map(op => ({
        kind: OpKind.TRANSACTION,
        ...op,
      }))
    );

    return t.prepare.toPreapply(batch);
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

    const poe_proposals = proposals.transfers.filter(v => v.type === "poe");
    const regular_proposals = proposals.transfers.filter(v => v.type !== "poe");

    let storage: contractStorage | undefined = undefined;
    if (poe_proposals.length > 0 && isSigning) {
      storage = toStorage(this.version, await cc.storage(), BigNumber(0));
    }

    poe_proposals.forEach(async v => {
      if (v.type === "poe") {
        const content = stringToBytes(v.values.payload);
        const params = cc.methods.proof_of_event_challenge(content);

        if (!batchOp) {
          throw new Error(
            "Internal error: batchOp is undefined. It should never happen."
          );
        }
        batchOp.withContractCall(params);

        if (isSigning && storage !== undefined) {
          const proposalId = storage.proposal_counter.plus(proposalIdOffset);
          super.genSignAndResolveOps(
            true,
            batchOp,
            cc,
            proposalId,
            [
              {
                proof_of_event: content,
              },
            ],
            isResolving
          );
        }

        proposalIdOffset = proposalIdOffset.plus(1);
      }
    });

    return super.submitTxProposals(
      cc,
      t,
      { transfers: regular_proposals },
      convertTezToMutez,
      batchOp,
      isSigning,
      isResolving,
      proposalIdOffset
    );
  }

  static override toContractState(
    contract: any,
    balance: BigNumber
  ): contractStorage {
    let c: c1 = contract;
    return {
      ...super.toContractState(contract, balance),
      version: "0.3.4",
    };
  }

  static override mapContent(content: content): proposalContent {
    if ("execute_lambda" in content) {
      const contentLambda = content.execute_lambda.lambda;
      const metadata = content.execute_lambda.metadata;

      const meta = !!metadata
        ? bytesToString(typeof metadata === "string" ? metadata : metadata.Some)
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
    } else if ("proof_of_event" in content) {
      return {
        proof_of_event: content.proof_of_event,
      };
    }

    throw new Error(`unknown proposal: ${JSON.stringify(content)}`);
  }
}

export default Version0_3_4;
