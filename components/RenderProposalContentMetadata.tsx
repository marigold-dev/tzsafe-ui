import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Parser } from "@taquito/michel-codec";
import { useState } from "react";
import { proposalContent } from "../types/display";
import { crop } from "../utils/strings";
import { mutezToTez } from "../utils/tez";
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
}: {
  content: proposalContent;
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
        params: metadata.lambda,
      };
    } else if (metadata?.meta?.includes("fa1_2_address")) {
      const contractData = JSON.parse(metadata.meta).payload;

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
        params: JSON.stringify({
          name: contractData.name,
          fa1_2_address: contractData.fa1_2_address,
        }),
      };
    } else if (metadata?.meta?.includes("fa2_address")) {
      const contractData = JSON.parse(metadata.meta);
      data = {
        label: "Transfer FA2",
        metadata: undefined,
        amount: contractData.amount,
        addresses: [contractData.contract_addr],
        entrypoints: undefined,
        params: JSON.stringify(contractData.payload),
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
        params: JSON.stringify(
          txs.map(
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
            }) => ({
              fa2_address: metadata.contract_address,
              name,
              token_id,
              to: to_,
              amount,
            })
          )
        ),
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
