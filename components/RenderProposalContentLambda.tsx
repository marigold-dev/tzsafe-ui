import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Parser } from "@taquito/michel-codec";
import BigNumber from "bignumber.js";
import { useState } from "react";
import { LambdaType, parseLambda } from "../context/parseLambda";
import { proposalContent } from "../types/display";
import { crop } from "../utils/strings";
import { mutezToTez } from "../utils/tez";
import { walletToken } from "../utils/useWalletTokens";
import Alias from "./Alias";
import Tooltip from "./Tooltip";

type data = {
  label: undefined | string;
  metadata: undefined | string;
  amount: undefined | string;
  addresses: undefined | string[];
  entrypoints: undefined | string;
  params: undefined | string;
};

const RenderProposalContentLambda = ({
  content,
  walletTokens,
}: {
  content: proposalContent;
  walletTokens: walletToken[];
}) => {
  const [hasParam, setHasParam] = useState(false);

  let data: data = {
    label: undefined,
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
      params: content.changeThreshold.toString(),
    };
  } else if ("adjustEffectivePeriod" in content) {
    data = {
      ...data,
      label: "Update proposal duration",
      params: content.adjustEffectivePeriod.toString(),
    };
  } else if ("addOwners" in content) {
    data = {
      ...data,
      label: `Add signer${content.addOwners.length > 1 ? "s" : ""}`,
      addresses: content.addOwners,
    };
  } else if ("removeOwners" in content) {
    data = {
      ...data,
      label: `Remove signer${content.removeOwners.length > 1 ? "s" : ""}`,
      addresses: content.removeOwners,
    };
  } else if ("transfer" in content) {
    data = {
      ...data,
      label: "Transfer",
      addresses: [content.transfer.destination],
      amount: `${mutezToTez(content.transfer.amount)} Tez`,
    };
  } else if ("execute" in content) {
    data = {
      ...data,
      label: "Execute",
      metadata: content.execute,
    };
  } else if ("executeLambda" in content) {
    const metadata = JSON.parse(content.executeLambda.metadata ?? "{}");

    const parser = new Parser();

    const [type, lambda] = parseLambda(
      parser.parseMichelineExpression(content.executeLambda.content ?? "")
    );

    if (type === LambdaType.LAMBDA_EXECUTION) {
      data = {
        ...data,
        label: "Execute lambda",
        metadata:
          metadata.meta === "No meta supplied" ? undefined : metadata.meta,
        amount: !!lambda?.mutez ? `${mutezToTez(lambda.mutez)} Tez` : undefined,
        params: metadata.lambda,
      };
    } else if (type === LambdaType.CONTRACT_EXECUTION) {
      data = {
        ...data,
        label: "Execute contract",
        addresses: !!lambda?.contractAddress
          ? [lambda.contractAddress]
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

      data = {
        metadata: undefined,
        label: `${
          type === LambdaType.FA1_2_APPROVE ? "Approve" : "Transfer"
        } FA1.2`,
        amount: (() => {
          const amount =
            "value" in lambdaData ? lambdaData.value : lambdaData.amount;

          if (!token) return amount.toString();

          return BigNumber(amount)
            .div(BigNumber(10).pow(token.token.metadata.decimals))
            .toString();
        })(),
        addresses: [
          "spender" in lambdaData ? lambdaData.spender : lambdaData.to,
        ],
        entrypoints: undefined,
        params: JSON.stringify({
          name: token?.token.metadata.name,
          fa1_2_address: lambda?.contractAddress,
        }),
      };
    } else if (type === LambdaType.FA2) {
      const lambdaData = lambda?.data as {
        from_: string;
        txs: { to_: string; token_id: number; amount: number }[];
      }[];

      const token = walletTokens.find(
        token => token.token.contract.address === lambda?.contractAddress
      );

      data = {
        label: "Transfer FA2",
        metadata: undefined,
        amount: undefined,
        addresses: undefined,
        entrypoints: undefined,
        params: JSON.stringify(
          lambdaData[0].txs.map(({ to_, token_id, amount }) => ({
            fa2_address: token?.token.contract.address,
            name: token?.token.metadata.name,
            token_id,
            to: to_,
            amount: BigNumber(amount)
              .div(BigNumber(10).pow(token?.token.metadata.decimals ?? 0))
              .toString(),
          }))
        ),
      };
    } else if (type === LambdaType.DELEGATE || type === LambdaType.UNDELEGATE) {
      const address = (lambda?.data as { address?: string }).address;
      data = {
        label: type === LambdaType.DELEGATE ? "Delegate" : "Undelegate",
        metadata: undefined,
        amount: undefined,
        addresses: !!address ? [address] : undefined,
        entrypoints: undefined,
        params: undefined,
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
        label: "Execute contract",
        metadata: meta,
        amount: !!amount ? `${amount} Tez` : undefined,
        addresses: [address],
        entrypoints: entrypoint,
        params:
          typeof arg === "object" || Array.isArray(arg)
            ? JSON.stringify(arg)
            : arg,
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
      };
    }
  }

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
            Metadata
            <Tooltip text="Metadata is user defined. It may not reflect on behavior of lambda">
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
          <p className="font-medium text-zinc-500 lg:hidden">Params/Token</p>
          <div>
            {!!data.params
              ? `${
                  data.params.length < 7
                    ? data.params
                    : data.params.substring(0, 7) + "..."
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
        {data.params}
      </div>
    </div>
  );
};

export const labelOfProposalContentLambda = (content: proposalContent) => {
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
      parser.parseMichelineExpression(content.executeLambda.content ?? "")
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
      : "Execute lambda";
  }
};

export default RenderProposalContentLambda;
