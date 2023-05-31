import { InfoCircledIcon, TriangleDownIcon } from "@radix-ui/react-icons";
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

export const RenderProposalContent = ({
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
            }: {
              to_: string;
              token_id: number;
              amount: number;
            }) => ({
              fa2_address: metadata.contract_address,
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
    <div className="after:content[''] relative w-full text-xs after:absolute after:left-0 after:right-0 after:-bottom-2 after:h-px after:bg-zinc-500 md:text-base lg:after:hidden">
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
          } w-auto justify-self-end text-right lg:w-full lg:w-auto lg:justify-self-start lg:text-left`}
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
        } mt-2 overflow-auto rounded bg-zinc-900 px-4 py-4 font-light`}
      >
        {data.params}
      </div>
    </div>
  );
};

const labelOfProposalContent = (content: proposalContent) => {
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

type ProposalCardProps = {
  id: number;
  status: React.ReactNode;
  date: Date;
  activities: { signer: string; hasApproved: boolean }[];
  content: proposalContent[];
  proposer: { actor: string; timestamp: string };
  resolver: { actor: string; timestamp: string } | undefined;
  isSignable?: boolean;
  shouldResolve?: boolean;
  setCloseModal?: (arg: boolean | undefined) => void;
};

const ProposalCard = ({
  id,
  status,
  date,
  activities,
  proposer,
  resolver,
  content,
  isSignable = false,
  shouldResolve = false,
  setCloseModal,
}: ProposalCardProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const proposalDate = new Date(proposer.timestamp);
  const resolveDate = new Date(resolver?.timestamp ?? 0);

  return (
    <div
      className={`${
        isOpen ? "h-auto" : isSignable ? "h-32" : "h-16"
      } w-full overflow-hidden rounded bg-zinc-800 text-white`}
    >
      <button
        className="grid h-16 w-full grid-cols-3 items-center gap-8 border-b border-zinc-900 px-6 py-4 lg:grid-cols-4"
        onClick={() => {
          setIsOpen(v => !v);
        }}
      >
        <span className="justify-self-start font-bold">
          <span className="mr-4 font-light text-zinc-500">
            #{id.toString().padStart(2, "0")}
          </span>
          {status ?? "Rejected"}
        </span>
        <span
          className="ml-8 truncate font-light text-zinc-300 md:ml-0"
          style={{
            minWidth: "7rem",
          }}
          title={content.map(labelOfProposalContent).join(", ")}
        >
          {content.map(labelOfProposalContent).join(", ")}
        </span>
        <span className="hidden min-w-max justify-self-end lg:block lg:translate-x-1/2">
          {isSignable ? "Expires at: " : ""}
          {date.toLocaleDateString()} -{" "}
          {`${date.getHours().toString().padStart(2, "0")}:${date
            .getMinutes()
            .toString()
            .padStart(2, "0")}`}
        </span>

        <div className="justify-self-end">
          <TriangleDownIcon
            className={`${isOpen ? "rotate-180" : ""} h-8 w-8`}
          />
        </div>
      </button>
      {isSignable && (
        <div className="flex h-16 w-full items-center justify-around space-x-4 px-6 lg:space-x-0">
          {!shouldResolve && (
            <>
              <button
                type="button"
                className={
                  "block w-full rounded bg-primary p-1.5 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500 md:w-1/3"
                }
                onClick={async e => {
                  e.preventDefault();
                  setCloseModal?.(false);
                }}
              >
                Reject
              </button>
              <button
                type="button"
                className={
                  "block w-full rounded bg-primary p-1.5 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500 md:w-1/3"
                }
                onClick={async e => {
                  e.preventDefault();
                  setCloseModal?.(true);
                }}
              >
                Sign
              </button>
            </>
          )}

          {shouldResolve && (
            <button
              type="button"
              className={
                "block w-full rounded bg-primary p-1.5 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500 md:w-1/3"
              }
              onClick={async e => {
                e.preventDefault();
                setCloseModal?.(undefined);
              }}
            >
              Resolve
            </button>
          )}
        </div>
      )}
      <div className="space-y-4 px-6 py-4">
        <section>
          <span className="text-xl font-bold">Content</span>
          <div className="mt-4 grid hidden w-full grid-cols-6 gap-4 text-zinc-500 lg:grid">
            <span>Function</span>
            <span className="flex items-center">
              Metadata
              <Tooltip text="Metadata is user defined. It may not reflect on behavior of lambda">
                <InfoCircledIcon className="ml-2 h-4 w-4" />
              </Tooltip>
            </span>
            <span className="justify-self-center">Amount</span>
            <span className="justify-self-center">Address</span>
            <span className="justify-self-end">Entrypoint</span>
            <span className="justify-self-end">Params/Token</span>
          </div>
          <div className="mt-2 space-y-4 font-light lg:space-y-2">
            {content.map((v, i) => (
              <RenderProposalContent key={i} content={v} />
            ))}
          </div>
        </section>
        <section className="text-xs md:text-base">
          <span className="text-xl font-bold">Activity</span>
          {isSignable && (
            <p className="mt-2 font-light lg:hidden">
              Expires at: {date.toLocaleDateString()} -{" "}
              {`${date.getHours().toString().padStart(2, "0")}:${date
                .getMinutes()
                .toString()
                .padStart(2, "0")}`}
            </p>
          )}
          <div className="mt-4 grid grid grid-cols-3 text-zinc-500">
            <span>Date</span>
            <span className="justify-self-center">Proposer</span>
            <span className="justify-self-end">Status</span>
          </div>
          <div className="mt-2 space-y-2 font-light">
            <div className="grid grid-cols-3">
              <span className="w-full font-light">
                <span>
                  <span>{proposalDate.toLocaleDateString()}</span>
                  <span className="hidden lg:inline">
                    -{" "}
                    {`${proposalDate
                      .getHours()
                      .toString()
                      .padStart(2, "0")}:${proposalDate
                      .getMinutes()
                      .toString()
                      .padStart(2, "0")}`}
                  </span>
                </span>
              </span>
              <span className="justify-self-center">
                <span className="hidden lg:inline">
                  <Alias address={proposer.actor} />
                </span>
                <span className="lg:hidden">
                  <Alias address={proposer.actor} length={3} />
                </span>
              </span>
              <span className="justify-self-end">Proposed</span>
            </div>
            {activities.map(({ signer, hasApproved }, i) => (
              <div key={i} className="grid grid-cols-3">
                <span className="w-full justify-self-start font-light text-zinc-500">
                  -
                </span>
                <span className="justify-self-center">
                  <span className="hidden lg:inline">
                    <Alias address={signer} />
                  </span>
                  <span className="lg:hidden">
                    <Alias address={signer} length={3} />
                  </span>
                </span>
                <span className="justify-self-end">
                  {hasApproved ? "Approved" : "Rejected"}
                </span>
              </div>
            ))}
            {!!resolver && (
              <div className="grid grid-cols-3">
                <span className="justify-self-start font-light">
                  {resolveDate.toLocaleDateString()} -{" "}
                  {`${resolveDate
                    .getHours()
                    .toString()
                    .padStart(2, "0")}:${resolveDate
                    .getMinutes()
                    .toString()
                    .padStart(2, "0")}`}
                </span>
                <span className="justify-self-center">
                  <span className="hidden lg:inline">
                    <Alias address={resolver.actor} />
                  </span>
                  <span className="lg:hidden">
                    <Alias address={resolver.actor} length={3} />
                  </span>
                </span>
                <span className="justify-self-end">Resolved</span>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProposalCard;
