import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Parser, emitMicheline } from "@taquito/michel-codec";
import BigNumber from "bignumber.js";
import { useState } from "react";
import FA2Display from "../components/FA2Display";
import { LambdaType, parseLambda } from "../context/parseLambda";
import { Dapp } from "../dapps/identifyDapp";
import { tezosDomainsContracts } from "../dapps/tezosDomains";
import {
  fa1_2Token,
  fa2Tokens,
  proposalContent,
  version,
} from "../types/display";
import { secondsToDuration } from "../utils/adaptiveTime";
import { hexToAscii } from "../utils/bytes";
import { crop } from "../utils/strings";
import { mutezToTez } from "../utils/tez";
import { toImageUri } from "../utils/tokenImage";
import { walletToken } from "../utils/useWalletTokens";
import Alias from "./Alias";
import FA1_2Display from "./FA1_2Display";

export type data =
  | {
      type: "AddSigner" | "RemoveSigner";
      label: undefined | string;
      metadata: undefined | string;
      amount: undefined | string;
      addresses: undefined | string[];
      entrypoints: undefined | string;
      params: undefined | string;
      rawParams: undefined | string;
    }
  | {
      type:
        | "UpdateThreshold" // legacy code
        | "UpdateProposalDuration"
        | "Transfer"
        | "Execute"
        | "ExecuteLambda"
        | "ExecuteContract"
        | "TransferFA2"
        | "TransferFA1_2"
        | "ApproveFA1_2"
        | "Delegate"
        | "UnDelegate"
        | "Poe";
      label: undefined | string;
      metadata: undefined | string;
      amount: undefined | string;
      addresses: undefined | string;
      entrypoints: undefined | string;
      params: undefined | string | fa2Tokens | fa1_2Token;
      rawParams: undefined | string;
    };

export type transaction = Extract<data, { addresses: undefined | string }>;

export const contentToData = (
  version: version,
  content: proposalContent,
  walletTokens: walletToken[]
): data => {
  let data: data = {
    type: "ExecuteLambda",
    label: undefined,
    metadata: undefined,
    amount: undefined,
    addresses: undefined,
    entrypoints: undefined,
    params: undefined,
    rawParams: undefined,
  };
  // "changeThreshold is a legacy."
  if ("changeThreshold" in content) {
    data = {
      ...data,
      type: "UpdateThreshold",
      label: "Update threshold",
      params: content.changeThreshold.toString(),
    };
  } else if ("adjustEffectivePeriod" in content) {
    const duration = secondsToDuration(
      Number(content.adjustEffectivePeriod.toString())
    );
    const days = duration.days
      ? duration.days > 1
        ? `${duration.days} days `
        : `${duration.days} day `
      : "";
    const hours = duration.hours
      ? duration.hours > 1
        ? `${duration.hours} hours `
        : `${duration.hours} hour`
      : "";
    const minutes = duration.minutes
      ? duration.minutes > 1
        ? `${duration.minutes} mins`
        : `${duration.minutes} min`
      : "";
    data = {
      ...data,
      type: "UpdateProposalDuration",
      label: "Update proposal duration",
      params: `${days}${hours}${minutes}`,
      rawParams: content.adjustEffectivePeriod.toString(),
    };
  } else if ("addOwners" in content) {
    data = {
      ...data,
      type: "AddSigner",
      label: `Add signer${content.addOwners.length > 1 ? "s" : ""}`,
      addresses: content.addOwners,
    };
  } else if ("removeOwners" in content) {
    data = {
      ...data,
      type: "RemoveSigner",
      label: `Remove signer${content.removeOwners.length > 1 ? "s" : ""}`,
      addresses: content.removeOwners,
    };
  } else if ("transfer" in content) {
    data = {
      ...data,
      type: "Transfer",
      label: "Transfer",
      addresses: content.transfer.destination,
      amount: `${mutezToTez(content.transfer.amount)} Tez`,
    };
  } else if ("add_or_update_metadata" in content) {
    data = {
      ...data,
      type: "AddOrUpdateMetadata",
      label: "Contract Metadata (TZIP16)",
      params: JSON.stringify({
        key: content.add_or_update_metadata.key,
        value: hexToAscii(content.add_or_update_metadata.value),
      }),
    };
  } else if ("execute" in content) {
    data = {
      ...data,
      type: "Execute",
      label: "Execute",
      metadata: content.execute,
    };
  } else if ("executeLambda" in content) {
    const metadata = JSON.parse(content.executeLambda.metadata ?? "{}");

    const parser = new Parser();

    const [type, lambda] = parseLambda(
      version,
      // Required for version 0.0.10
      typeof content.executeLambda.content === "string"
        ? parser.parseMichelineExpression(content.executeLambda.content ?? "")
        : content.executeLambda.content ?? null
    );

    if (type === LambdaType.LAMBDA_EXECUTION) {
      data = {
        ...data,
        label: "Execute lambda",
        metadata:
          metadata.meta === "No meta supplied" ? undefined : metadata.meta,
        amount: !!lambda?.mutez ? `${mutezToTez(lambda.mutez)} Tez` : undefined,
        params: Array.isArray(metadata.lambda)
          ? emitMicheline(metadata.lambda)
          : metadata.lambda,
      };
    } else if (type === LambdaType.CONTRACT_EXECUTION) {
      data = {
        ...data,
        type: "ExecuteContract",
        label: "Execute contract",
        addresses: !!lambda?.contractAddress
          ? lambda.contractAddress
          : undefined,
        entrypoints: !lambda?.entrypoint.name
          ? "default"
          : lambda.entrypoint.name,
        amount: !!lambda?.mutez ? `${mutezToTez(lambda.mutez)} Tez` : undefined,
        params: !lambda?.data
          ? "Unit"
          : Array.isArray(lambda.data) && lambda.data.length === 0
          ? "Unit"
          : (lambda.data as string),
      };
    } else if (
      type === LambdaType.FA1_2_APPROVE ||
      type === LambdaType.FA1_2_TRANSFER
    ) {
      const lambdaData = lambda?.data as
        | { spender: string; value: number }
        | { from: string; to: string; amount: number };

      const token = walletTokens.find(
        token => token.token.contract.address === lambda?.contractAddress
      );

      let imageUri = token?.token.metadata.thumbnailUri;
      imageUri = toImageUri(imageUri);
      data = {
        metadata: undefined,
        type:
          type === LambdaType.FA1_2_APPROVE ? "ApproveFA1_2" : "TransferFA1_2",
        label: `${
          type === LambdaType.FA1_2_APPROVE ? "Approve" : "Transfer"
        } FA1.2`,
        amount: (() => {
          const amount =
            "value" in lambdaData ? lambdaData.value : lambdaData.amount;

          return BigNumber(amount).div(
            BigNumber(10).pow(token?.token.metadata.decimals ?? 0)
          );
        })(),
        addresses: "spender" in lambdaData ? lambdaData.spender : lambdaData.to,
        entrypoints: undefined,
        params: {
          name: token?.token.metadata.name,
          fa1_2_address: lambda?.contractAddress,
          imageUri,
          hasDecimal: !!token,
        } as fa1_2Token,
        rawParams: undefined,
      };
    } else if (type === LambdaType.FA2) {
      const lambdaData = lambda?.data as {
        from_: string;
        txs: { to_: string; token_id: number; amount: number }[];
      }[];

      data = {
        type: "TransferFA2",
        label: "Transfer FA2",
        metadata: undefined,
        amount: undefined,
        addresses: undefined,
        entrypoints: undefined,
        params: lambdaData[0].txs.map(({ to_, token_id, amount }) => {
          const token: walletToken | undefined = walletTokens.find(
            token =>
              token.token.contract.address === lambda?.contractAddress &&
              token.token.tokenId === token_id.toString()
          );
          const metadata = token?.token.metadata;
          let imageUri = metadata?.thumbnailUri;

          if (!imageUri && metadata && "displayUri" in metadata)
            imageUri = metadata.displayUri;

          imageUri = toImageUri(imageUri);

          return {
            fa2_address:
              token?.token.contract.address ?? lambda?.contractAddress,
            name: token?.token.metadata.name,
            token_id,
            to: to_,
            imageUri: imageUri,
            amount: BigNumber(amount).div(
              BigNumber(10).pow(token?.token.metadata.decimals ?? 0)
            ),
            hasDecimal: !!token?.token.metadata.decimals,
          };
        }),
        rawParams: undefined,
      };
    } else if (type === LambdaType.DELEGATE || type === LambdaType.UNDELEGATE) {
      const address = (lambda?.data as { address?: string }).address;
      const meta = JSON.parse(metadata.meta ?? "{}") as {
        old_baker_address: string;
      };
      data = {
        type: type === LambdaType.DELEGATE ? "Delegate" : "UnDelegate",
        label: type === LambdaType.DELEGATE ? "Delegate" : "Undelegate",
        metadata: undefined,
        amount: undefined,
        addresses: !!address
          ? address
          : meta.old_baker_address
          ? meta.old_baker_address
          : undefined,
        entrypoints: undefined,
        params: undefined,
        rawParams: undefined,
      };
    } else if (type === LambdaType.POE) {
      data = {
        type: "Poe",
        label: "Proof of Event",
        metadata: undefined,
        amount: undefined,
        addresses: undefined,
        entrypoints: undefined,
        params: JSON.stringify(lambda?.data),
        rawParams: undefined,
      };
      // This condition handles some legacy code so old wallets don't crash
    } else if (metadata.meta) {
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
        type: "ExecuteContract",
        label: "Execute contract",
        metadata: meta,
        amount: !!amount ? `${amount} Tez` : undefined,
        addresses: address,
        entrypoints: entrypoint,
        params:
          typeof arg === "object" || Array.isArray(arg)
            ? JSON.stringify(arg)
            : arg,
        rawParams: undefined,
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
        type: "ExecuteContract",
        label: "Execute contract",
        metadata: meta,
        amount: !!amount ? `${amount} Tez` : undefined,
        addresses: address,
        entrypoints: entrypoint,
        params:
          typeof arg === "object" || Array.isArray(arg)
            ? JSON.stringify(arg)
            : arg,
        rawParams: undefined,
      };
    }
  }
  return data;
};

const RenderProposalContentLambda = ({
  data,
  isOpenToken: isOpenToken = false,
}: {
  data: data;
  isOpenToken?: boolean;
}) => {
  const [hasParam, setHasParam] = useState(
    () =>
      isOpenToken &&
      (data.type == "TransferFA1_2" ||
        data.type == "ApproveFA1_2" ||
        data.type == "TransferFA2")
  );
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
          {!data.amount
            ? "-"
            : data.params &&
              typeof data.params !== "string" &&
              "fa1_2_address" in data.params &&
              !data.params.hasDecimal
            ? `${data.amount}*`
            : `${data.amount}`}
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
            {Array.isArray(data.addresses) ? (
              data.addresses.map((address, i) => (
                <li key={i}>
                  <Alias address={address} />
                </li>
              ))
            ) : (
              <li>
                <Alias address={data.addresses} />
              </li>
            )}
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
              data.addresses?.at(0) && data.amount instanceof BigNumber ? (
                <FA1_2Display
                  data={data.params}
                  to={data.addresses.at(0)}
                  amount={data.amount}
                />
              ) : (
                JSON.stringify(data.params)
              )
            ) : (
              <FA2Display data={data.params} />
            )
          ) : data.type !== "ApproveFA1_2" &&
            data.type !== "TransferFA1_2" &&
            data.type !== "TransferFA2" ? (
            data.params
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

export const labelOfProposalContentLambda = (
  version: version,
  content: proposalContent
) => {
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
  } else if ("execute" in content) {
    return "Execute";
  } else if ("executeLambda" in content) {
    const parser = new Parser();

    const [type, _] = parseLambda(
      version,
      // Required for version 0.0.10
      typeof content.executeLambda.content === "string"
        ? parser.parseMichelineExpression(content.executeLambda.content ?? "")
        : content.executeLambda.content ?? null
    );

    return type === LambdaType.FA2
      ? "Transfer FA2"
      : type === LambdaType.FA1_2_APPROVE
      ? "Approve FA1.2"
      : type === LambdaType.FA1_2_TRANSFER
      ? "Transfer FA1.2"
      : type === LambdaType.DELEGATE
      ? "Delegate"
      : type === LambdaType.UNDELEGATE
      ? "Undelegate"
      : type === LambdaType.CONTRACT_EXECUTION
      ? "Execute contract"
      : type === LambdaType.POE
      ? "Proof of Event"
      : "Execute lambda";
  }
};

export default RenderProposalContentLambda;
