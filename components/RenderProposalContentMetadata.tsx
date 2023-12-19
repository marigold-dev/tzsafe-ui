import { InfoCircledIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import { tokenToString } from "typescript";
import { fa1_2Token, fa2Tokens, proposalContent } from "../types/display";
import { crop } from "../utils/strings";
import { mutezToTez } from "../utils/tez";
import { toImageUri } from "../utils/tokenImage";
import { walletToken } from "../utils/useWalletTokens";
import Alias from "./Alias";
import FA1_2Display from "./FA1_2Display";
import FA2Display from "./FA2Display";
import Tooltip from "./Tooltip";

type data = {
  label: undefined | string;
  type:
    | "UpdateThreshold" // legacy code
    | "UpdateProposalDuration"
    | "AddSigner"
    | "RemoveSigner"
    | "Transfer"
    | "Execute"
    | "ExecuteLambda"
    | "ExecuteContract"
    | "TransferFA2"
    | "TransferFA1_2"
    | "ApproveFA1_2"
    | "Delegate"
    | "UnDelegate"
    | "Poe"
    | "AddOrUpdateMetadata";
  metadata: undefined | string;
  amount: undefined | string;
  addresses: undefined | string[];
  entrypoints: undefined | string;
  params: undefined | string | fa2Tokens | fa1_2Token;
};

const isFa2 = (payload: any[]) => {
  if (payload.length !== 1 || payload[0].txs.length === 0) return false;

  return (
    !!payload[0].txs[0].to_ &&
    !!payload[0].txs[0].token_id &&
    !!payload[0].txs[0].amount
  );
};

const RenderProposalContentMetadata = ({
  content,
  walletTokens,
  isOpenToken,
}: {
  content: proposalContent;
  walletTokens: walletToken[];
  isOpenToken?: boolean;
}) => {
  let data: data = {
    label: undefined,
    type: "Transfer",
    metadata: undefined,
    amount: undefined,
    addresses: undefined,
    entrypoints: undefined,
    params: undefined,
  };

  if ("changeThreshold" in content) {
    data = {
      ...data,
      label: "Update threshold",
      type: "UpdateThreshold",
      params: content.changeThreshold.toString(),
    };
  } else if ("adjustEffectivePeriod" in content) {
    data = {
      ...data,
      label: "Update proposal duration",
      params: content.adjustEffectivePeriod.toString(),
      type: "UpdateProposalDuration",
    };
  } else if ("addOwners" in content) {
    data = {
      ...data,
      label: `Add signer${content.addOwners.length > 1 ? "s" : ""}`,
      addresses: content.addOwners,
      type: "AddSigner",
    };
  } else if ("removeOwners" in content) {
    data = {
      ...data,
      label: `Remove signer${content.removeOwners.length > 1 ? "s" : ""}`,
      addresses: content.removeOwners,
      type: "RemoveSigner",
    };
  } else if ("transfer" in content) {
    data = {
      ...data,
      label: "Transfer",
      addresses: [content.transfer.destination],
      amount: `${mutezToTez(content.transfer.amount)} Tez`,
      type: "Transfer",
    };
  } else if ("execute" in content) {
    data = {
      ...data,
      label: "Execute",
      metadata: content.execute,
      type: "ExecuteContract",
    };
  } else if ("executeLambda" in content) {
    const metadata = JSON.parse(content.executeLambda.metadata ?? "{}");

    if (
      !metadata?.contract_address &&
      !metadata?.meta?.includes("contract_addr") &&
      !metadata?.meta?.includes("baker_address") &&
      !metadata?.meta?.includes("fa1_2_address")
    ) {
      data = {
        ...data,
        label: "Execute lambda",
        metadata:
          metadata.meta === "No meta supplied" ? undefined : metadata.meta,
        params:
          Array.isArray(metadata.lambda) || typeof metadata.lambda === "object"
            ? JSON.stringify(metadata.lambda)
            : metadata.lambda,
        type: "ExecuteLambda",
      };
    } else if (metadata?.meta?.includes("fa1_2_address")) {
      const contractData = JSON.parse(metadata.meta).payload;
      const token = walletTokens.find(
        token => token.token.contract.address === contractData.fa1_2_address
      );

      let imageUri = token?.token.metadata.thumbnailUri;
      imageUri = toImageUri(imageUri);

      data = {
        metadata: undefined,
        label: `${
          !!contractData.spender_address ? "Approve" : "Transfer"
        } FA1.2`,
        amount: contractData.amount,
        addresses: [
          !!contractData.spender_address
            ? contractData.spender_address
            : contractData.to,
        ],
        entrypoints: undefined,
        params: {
          name: contractData.name,
          fa1_2_address: contractData.fa1_2_address,
          imageUri,
          hasDecimal: true,
        },
        type: !!contractData.spender_address ? "ApproveFA1_2" : "TransferFA1_2",
      };
    } else if (metadata?.meta?.includes("fa2_address")) {
      const contractData = JSON.parse(metadata.meta);
      const payload = contractData.payload;

      if (Array.isArray(payload)) {
        payload.map((v: any) => {
          if (
            v === undefined ||
            !("token_id" in v) ||
            !("fa2_address" in v) ||
            !("amount" in v)
          )
            return v;
          const token = walletTokens.find(
            token =>
              token.token.contract.address === v.fa2_address &&
              token.token.tokenId === v.token_id.toString()
          );
          const tokenMetadata = token?.token.metadata;
          let imageUri = tokenMetadata?.thumbnailUri;

          if (!imageUri && tokenMetadata && "displayUri" in tokenMetadata)
            imageUri = tokenMetadata.displayUri;

          imageUri = toImageUri(imageUri);
          v.imageUri = imageUri;
          v.name = token?.token.metadata.name;
          v.amount = v.amount.toString();
          // the "to" is incorrrect in metadata, users have to go block explorer to check.
          v.to = "please refer to the block explorer";
          v.hasDecimal = true;
          return v;
        });
      }
      data = {
        label: "Transfer FA2",
        metadata: undefined,
        amount: undefined,
        addresses: undefined,
        entrypoints: undefined,
        params: payload,
        type: "TransferFA2",
      };
    } else if (
      metadata.entrypoint === "%transfer" &&
      Array.isArray(metadata.payload) &&
      isFa2(metadata.payload)
    ) {
      const [{ txs }] = metadata.payload;

      data = {
        label: "Transfer FA2",
        metadata: undefined,
        amount: undefined,
        addresses: [],
        entrypoints: undefined,
        params: txs.map(
          ({
            to_,
            token_id,
            amount,
            name,
          }: {
            to_: string;
            token_id: number;
            amount: number;
            name?: string;
          }) => {
            const token = walletTokens.find(
              token =>
                token.token.contract.address === metadata.contractAddress &&
                token.token.tokenId === token_id.toString()
            );
            const tokenMetadata = token?.token.metadata;
            let imageUri = tokenMetadata?.thumbnailUri;

            if (!imageUri && tokenMetadata && "displayUri" in tokenMetadata)
              imageUri = tokenMetadata.displayUri;

            imageUri = toImageUri(imageUri);

            return {
              fa2_address: metadata.contract_address,
              name,
              token_id,
              to: to_,
              amount: amount.toString(),
              imageUri,
              hasDecimal: !!token,
            };
          }
        ),
        type: "TransferFA2",
      };
    } else if (metadata?.meta?.includes("baker_address")) {
      const contractData = JSON.parse(metadata.meta);

      const isCancelling = !!contractData.old_baker_address;

      data = {
        label: isCancelling ? "Undelegate" : "Delegate",
        metadata: undefined,
        amount: undefined,
        addresses: [
          isCancelling
            ? contractData.old_baker_address
            : contractData.baker_address,
        ],
        entrypoints: undefined,
        params: undefined,
        type: "Delegate",
      };
    }
    // This condition handles some legacy code so old wallets don't crash
    else if (metadata.meta) {
      const [meta, amount, address, entrypoint, arg] = (() => {
        const contractData = JSON.parse(metadata.meta);

        return [
          undefined,
          mutezToTez(contractData.mutez_amount),
          contractData.contract_addr,
          contractData.entrypoint ?? "default",
          contractData.payload ?? "Unit",
        ];
      })();

      data = {
        label: "Execute contract",
        metadata: meta,
        amount: !!amount ? `${amount} Tez` : undefined,
        addresses: [address],
        entrypoints: entrypoint,
        params:
          typeof arg === "object" || Array.isArray(arg)
            ? JSON.stringify(arg)
            : arg,
        type: "ExecuteLambda",
      };
    } else {
      const [meta, amount, address, entrypoint, arg] = (() => {
        return [
          undefined,
          mutezToTez(metadata.mutez_amount),
          metadata.contract_address,
          metadata.entrypoint ?? "default",
          metadata.payload ?? "Unit",
        ];
      })();

      data = {
        label: "Execute contract",
        metadata: meta,
        amount: !!amount ? `${amount} Tez` : undefined,
        addresses: [address],
        entrypoints: entrypoint,
        params:
          typeof arg === "object" || Array.isArray(arg)
            ? JSON.stringify(arg)
            : arg,
        type: "ExecuteContract",
      };
    }
  }

  let defaultOpen = false;
  if (
    isOpenToken &&
    (data.type == "TransferFA1_2" ||
      data.type == "ApproveFA1_2" ||
      data.type == "TransferFA2")
  )
    defaultOpen = true;
  const [hasParam, setHasParam] = useState(defaultOpen);

  return (
    <div className="after:content[''] relative w-full text-xs after:absolute after:-bottom-2 after:left-0 after:right-0 after:h-px after:bg-zinc-500 md:text-base lg:after:hidden">
      <button
        className={`${
          !data.params ? "cursor-default" : ""
        } grid w-full grid-cols-2 gap-4 text-left lg:grid-cols-6`}
        onClick={() => {
          if (!data.params) return;

          setHasParam(v => !v);
        }}
        type="button"
        title={!!data.params ? "Show parameters" : undefined}
      >
        <span
          className={`${!data.label ? "text-zinc-500" : ""} justify-self-start`}
        >
          <p className="font-medium text-zinc-500 lg:hidden">Function</p>
          {data.label ?? "-"}
        </span>
        <span
          className={`${
            !data.metadata ? "text-zinc-500" : ""
          } w-auto justify-self-end text-right lg:w-auto lg:w-full lg:justify-self-start lg:text-left`}
        >
          <p className="flex justify-center font-medium text-zinc-500 lg:hidden">
            Note
            <Tooltip text="The note is user defined. It may not reflect on behavior of lambda">
              <InfoCircledIcon className="ml-2 h-4 w-4" />
            </Tooltip>
          </p>
          {data.metadata ?? "-"}
        </span>
        <span
          className={`${
            !data.amount ? "text-zinc-500" : ""
          } justify-self-start text-left lg:justify-self-center lg:text-right`}
        >
          <p className="font-medium text-zinc-500 lg:hidden">Amount</p>
          {!data.amount ? "-" : `${data.amount}`}
        </span>
        {!data.addresses ? (
          <span className="lg:text-auto justify-self-end text-right text-zinc-500 lg:justify-self-center">
            <p className="font-medium text-zinc-500 lg:hidden">Address</p>-
          </span>
        ) : data.addresses.length === 1 ? (
          <span className="lg:text-auto justify-self-end text-right lg:justify-self-center">
            <p className="font-medium text-zinc-500 lg:hidden">Address</p>
            <Alias address={data.addresses[0]} />
          </span>
        ) : (
          <ul className="lg:text-auto justify-self-end text-right lg:justify-self-center">
            <li className="font-medium text-zinc-500 lg:hidden">Addresses</li>
            {data.addresses.map((address, i) => (
              <li key={i}>
                <Alias address={address} />
              </li>
            ))}
          </ul>
        )}
        <span
          className={`${
            !data.entrypoints ? "text-zinc-500" : ""
          } justify-self-left w-full text-left lg:w-auto lg:justify-self-end lg:text-center`}
          title={data.entrypoints}
        >
          <p className="font-medium text-zinc-500 lg:hidden">Entrypoint</p>
          {!!data.entrypoints ? crop(data.entrypoints, 18) : "-"}
        </span>
        <span
          className={`${
            !data.params ? "text-zinc-500" : ""
          } justify-self-end text-right`}
        >
          <p className="font-medium text-zinc-500 lg:hidden">Params/Tokens</p>
          <div>
            {!!data.params
              ? data.type == "TransferFA2" ||
                data.type == "ApproveFA1_2" ||
                data.type == "TransferFA1_2"
                ? hasParam
                  ? "click[+]"
                  : "click[-]"
                : `${
                    typeof data.params === "string"
                      ? data.params.length < 7
                        ? data.params
                        : data.params.substring(0, 7) + "..."
                      : "-"
                  }`
              : "-"}
          </div>
        </span>
      </button>
      <div
        className={`${
          hasParam ? "block" : "hidden"
        } mt-2 overflow-auto whitespace-pre-wrap rounded bg-zinc-900 px-4 py-4 font-light`}
      >
        {!!data.params ? (
          typeof data.params !== "string" ? (
            "fa1_2_address" in data.params ? (
              <FA1_2Display data={data.params} />
            ) : (
              <FA2Display data={data.params} />
            )
          ) : (
            JSON.stringify(data.params)
          )
        ) : (
          ""
        )}
      </div>
    </div>
  );
};

export const labelOfProposalContentMetadata = (content: proposalContent) => {
  if ("changeThreshold" in content) {
    return "Update threshold";
  } else if ("adjustEffectivePeriod" in content) {
    return "Update proposal duration";
  } else if ("addOwners" in content) {
    return `Add signer${content.addOwners.length > 1 ? "s" : ""}`;
  } else if ("removeOwners" in content) {
    return `Remove signer${content.removeOwners.length > 1 ? "s" : ""}`;
  } else if ("transfer" in content) {
    return `Transfer ${mutezToTez(content.transfer.amount)} Tez`;
  } else if ("add_or_update_metadata" in content) {
    return "Update Metadata(TZIP16)";
  } else if ("execute" in content) {
    return "Execute";
  } else if ("executeLambda" in content) {
    const metadata = JSON.parse(content.executeLambda.metadata ?? "{}");

    return (metadata.entrypoint === "%transfer" &&
      Array.isArray(metadata.payload) &&
      isFa2(metadata.payload)) ||
      (!!metadata.meta && metadata.meta.includes("fa2_address"))
      ? "Transfer FA2"
      : !!metadata.meta && metadata.meta.includes("challengeId")
      ? "Proof of Event"
      : !!metadata.meta &&
        metadata.meta.includes("fa1_2_address") &&
        metadata.meta.includes("spender_address")
      ? "Approve FA1.2"
      : !!metadata.meta && metadata.meta.includes("fa1_2_address")
      ? "Transfer FA1.2"
      : !!metadata.meta && metadata.meta.includes("old_baker_address")
      ? "Undelegate"
      : !!metadata.meta && metadata.meta.includes("baker_address")
      ? "Delegate"
      : metadata.contract_address ||
        (!!metadata.meta && metadata.meta?.includes("contract_addr"))
      ? "Execute contract"
      : "Execute lambda";
  }
};

export default RenderProposalContentMetadata;
