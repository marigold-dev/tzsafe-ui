import { InfoCircledIcon, TriangleDownIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import { proposalContent } from "../types/display";
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

export const renderProposalContent = (content: proposalContent, i: number) => {
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
      amount: content.transfer.amount.toString(),
    };
  } else if ("execute" in content) {
    data = {
      ...data,
      label: "Execute",
      metadata: content.execute,
    };
  } else if ("executeLambda" in content) {
    const metadata = JSON.parse(content.executeLambda.metadata ?? "{}");

    if (!metadata?.meta?.includes("contract_addr")) {
      data = {
        ...data,
        label: "Execute lambda",
        metadata:
          metadata.meta === "No meta supplied" ? undefined : metadata.meta,
      };
    } else {
      const contractData = JSON.parse(metadata.meta);
      const endpoint = contractData.entrypoint;
      const arg = contractData.payload;

      data = {
        label: "Execute contract",
        metadata: contractData.meta,
        amount: contractData.mutez_amount,
        addresses: [contractData.contract_addr],
        entrypoints: endpoint,
        params: JSON.stringify(arg),
      };
    }
  }

  return (
    <div
      key={i}
      className="after:content[''] relative grid grid-cols-3 gap-4 after:absolute after:left-0 after:right-0 after:-bottom-2 after:h-px after:bg-zinc-500 lg:grid-cols-6 lg:after:hidden"
    >
      <span
        className={`${!data.label ? "text-zinc-500" : ""} justify-self-start`}
      >
        <p className="text-zinc-500 lg:hidden">Function</p>
        {data.label ?? "-"}
      </span>
      <span
        className={`${
          !data.metadata ? "text-zinc-500" : ""
        } w-full justify-self-center text-center lg:w-auto lg:justify-self-start lg:text-left`}
      >
        <p className="flex text-zinc-500 lg:hidden">
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
        } justify-self-end text-right lg:justify-self-center`}
      >
        <p className="text-zinc-500 lg:hidden">Amount</p>
        {!data.amount ? "-" : `${data.amount} mutez`}
      </span>
      {!data.addresses ? (
        <span className="justify-self-start text-zinc-500 lg:justify-self-center">
          <p className="text-zinc-500 lg:hidden">Address</p>-
        </span>
      ) : data.addresses.length === 1 ? (
        <span className="justify-self-start lg:justify-self-center">
          <p className="text-zinc-500 lg:hidden">Address</p>
          <Alias address={data.addresses[0]} />
        </span>
      ) : (
        <ul className="justify-self-start lg:justify-self-center">
          <li className="text-zinc-500 lg:hidden">Addresses:</li>
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
        } w-full justify-self-center text-center lg:w-auto lg:justify-self-end`}
      >
        <p className="text-zinc-500 lg:hidden">Entrypoint</p>
        {data.entrypoints ?? "-"}
      </span>
      <span
        className={`${
          !data.params ? "text-zinc-500" : ""
        } justify-self-end text-right`}
      >
        <p className="text-zinc-500 lg:hidden">Params</p>
        {data.params ?? "-"}
      </span>
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
    return `Transfer ${content.transfer.amount} mutez`;
  } else if ("execute" in content) {
    return "Execute";
  } else if ("executeLambda" in content) {
    return "Execute lambda";
  }
};

type ProposalCardProps = {
  id: number;
  status: string;
  date: Date;
  activities: { signer: string; hasApproved: boolean }[];
  content: proposalContent[];
  proposer: { actor: string; timestamp: string };
  resolver: { actor: string; timestamp: string } | undefined;
  isSignable?: boolean;
  isExpired?: boolean;
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
  isExpired = false,
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
          className="ml-4 truncate font-light text-zinc-300 md:ml-0"
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
        <div className="flex h-16 w-full items-center justify-around px-6">
          {!isExpired && (
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

          {isExpired && (
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
            <span className="justify-self-end">Parameters</span>
          </div>
          <div className="mt-2 space-y-4 font-light lg:space-y-2">
            {content.map(renderProposalContent)}
          </div>
        </section>
        <section>
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
                {proposalDate.toLocaleDateString()} -{" "}
                {`${proposalDate.getHours()}:${proposalDate.getMinutes()}`}
              </span>
              <span className="justify-self-center">
                <Alias address={proposer.actor} />
              </span>
              <span className="justify-self-end">Proposed</span>
            </div>
            {activities.map(({ signer, hasApproved }, i) => (
              <div key={i} className="grid grid-cols-3">
                <span className="w-full justify-self-start font-light text-zinc-500">
                  -
                </span>
                <span className="justify-self-center">
                  <Alias address={signer} />
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
                  {`${resolveDate.getHours()}:${resolveDate.getMinutes()}`}
                </span>
                <span className="justify-self-center">
                  <Alias address={resolver.actor} />
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

// {
//   state.address &&
//     signers(contract).includes(state.address) &&
//     resolvable(prop.ui.signatures) &&
//     "Executed" !== prop.ui.status && (
//       <button
//         type="button"
//         className={
//           !isOwner
//             ? "pointer-events-none opacity-50 "
//             : "" +
//               "mx-none mx-auto block w-full self-center justify-self-end bg-primary p-1.5 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500 md:mx-auto md:w-1/3 md:self-end"
//         }
//         onClick={async e => {
//           e.preventDefault();
//           setCloseModal(undefined);
//         }}
//       >
//         Resolve
//       </button>
//     );
// }
// {
//   state.address && signers(contract).includes(state.address) && signable && (
//     <button
//       type="button"
//       className={
//         "mx-none mx-auto block w-full self-center justify-self-end rounded bg-primary p-1.5 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500 md:mx-auto md:w-1/3 md:self-end"
//       }
//       onClick={async e => {
//         e.preventDefault();
//         setCloseModal(true);
//       }}
//     >
//       Sign
//     </button>
//   );
// }
// {
//   state.address &&
//     signers(contract).includes(state.address) &&
//     !resolvable(prop.ui.signatures) &&
//     !signable &&
//     "Proposing" === prop.ui.status && (
//       <p className="mx-none mx-auto  block w-full self-center justify-self-end bg-primary p-1.5 font-medium text-white md:mx-auto md:w-1/3 md:self-end">
//         Waiting for signatures of other owners
//       </p>
//     );
// }
export default ProposalCard;
