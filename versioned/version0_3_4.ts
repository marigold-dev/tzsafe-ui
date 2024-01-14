import { emitMicheline } from "@taquito/michel-codec";
import { WalletContract, TezosToolkit, TransferParams } from "@taquito/taquito";
import { char2Bytes, bytes2Char } from "@taquito/utils";
import { BigNumber } from "bignumber.js";
import { DEFAULT_TIMEOUT } from "../context/config";
import { content, contractStorage as c1 } from "../types/Proposal0_3_4";
import { contractStorage } from "../types/app";
import { proposalContent } from "../types/display";
import { promiseWithTimeout } from "../utils/timeout";
import { proposals } from "./interface";
import Version0_3_3 from "./version0_3_3";

class Version0_3_4 extends Version0_3_3 {
  async submitTxProposals(
    cc: WalletContract,
    t: TezosToolkit,
    proposals: proposals
  ): Promise<[boolean, string]> {
    const poe_proposals = proposals.transfers.filter(v => v.type === "poe");
    const regular_proposals = proposals.transfers.filter(v => v.type !== "poe");

    if (
      proposals.transfers.length === 1 &&
      proposals.transfers[0].type === "poe"
    ) {
      const params: TransferParams = cc.methods
        .proof_of_event_challenge(
          char2Bytes(proposals.transfers[0].values.payload)
        )
        .toTransferParams();
      const op = await t.wallet.transfer(params).send();

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
    } else if (
      proposals.transfers.length >= 1 &&
      proposals.transfers.filter(v => v.type === "poe").length === 0
    ) {
      return super.submitTxProposals(cc, t, proposals);
    } else return [false, "doesn't support for TzSafe on UI"];
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
    } else if ("proof_of_event" in content) {
      return {
        proof_of_event: content.proof_of_event,
      };
    }

    throw new Error(`unknown proposal: ${JSON.stringify(content)}`);
  }
}

export default Version0_3_4;
