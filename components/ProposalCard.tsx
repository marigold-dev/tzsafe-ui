import { InfoCircledIcon, TriangleDownIcon } from "@radix-ui/react-icons";
import { useContext, useState, useMemo } from "react";
import { AppStateContext } from "../context/state";
import { proposalContent } from "../types/display";
import { walletToken } from "../utils/useWalletTokens";
import { signers } from "../versioned/apis";
import Alias from "./Alias";
import RenderProposalContentLambda, {
  labelOfProposalContentLambda,
  contentToData,
} from "./RenderProposalContentLambda";
import RenderProposalContentMetadata, {
  labelOfProposalContentMetadata,
} from "./RenderProposalContentMetadata";
import Tooltip from "./Tooltip";

type ProposalCardProps = {
  id: number;
  status: React.ReactNode;
  date: Date;
  activities: { signer: string; hasApproved: boolean }[];
  content: proposalContent[];
  walletTokens: walletToken[];
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
  walletTokens,
  setCloseModal,
  isSignable = false,
  shouldResolve = false,
}: ProposalCardProps) => {
  const state = useContext(AppStateContext)!;
  const currentContract = state.currentContract ?? "";

  const [isOpen, setIsOpen] = useState(false);

  const proposalDate = new Date(proposer.timestamp);
  const resolveDate = new Date(resolver?.timestamp ?? 0);

  const allSigners = signers(
    state.contracts[currentContract] ?? state.currentStorage
  );

  const rows = useMemo(
    () =>
      content.map(v =>
        contentToData(
          state.contracts[state.currentContract ?? ""]?.version ??
            state.currentStorage?.version,
          v,
          walletTokens
        )
      ),
    [content, state.currentContract, state.currentStorage, state.contracts]
  );

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
          title={content
            .map(v => {
              return "executeLambda" in v &&
                (!!v.executeLambda.content ||
                  !!v.executeLambda.metadata?.includes('"lambda"'))
                ? labelOfProposalContentLambda(
                    state.contracts[state.currentContract ?? ""]?.version ??
                      state.currentStorage?.version,
                    v
                  )
                : labelOfProposalContentMetadata(v);
            })
            .join(", ")}
        >
          {content
            .map(v =>
              "executeLambda" in v &&
              (!!v.executeLambda.content ||
                !!v.executeLambda.metadata?.includes('"lambda"'))
                ? labelOfProposalContentLambda(
                    state.contracts[state.currentContract ?? ""]?.version ??
                      state.currentStorage?.version,
                    v
                  )
                : labelOfProposalContentMetadata(v)
            )
            .join(", ")}
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
              Note
              <Tooltip text="The note is user defined. It may not reflect on behavior of lambda">
                <InfoCircledIcon className="ml-2 h-4 w-4" />
              </Tooltip>
            </span>
            <span className="justify-self-center">Amount</span>
            <span className="justify-self-center">Address</span>
            <span className="justify-self-end">Entrypoint</span>
            <span className="justify-self-end">Params/Tokens</span>
          </div>
          <div className="mt-2 space-y-4 font-light lg:space-y-2">
            {rows.map((v, i) => {
              // All the other types could be parsed, by the lambda
              return v.type === "ExecuteLambda" ? (
                <RenderProposalContentMetadata
                  key={i}
                  content={content[i]}
                  walletTokens={walletTokens}
                  isOpenToken={i === 0}
                />
              ) : (
                <RenderProposalContentLambda
                  key={i}
                  data={v}
                  isOpenToken={i === 0}
                />
              );
            })}
          </div>

          {rows.some(
            v =>
              !!v.params &&
              typeof v.params !== "string" &&
              ("fa1_2_address" in v.params
                ? !v.params.hasDecimal
                : v.params.some(v => !v.hasDecimal))
          ) && (
            <div className="mt-2 text-sm text-yellow-500">
              * There{"'"}s no decimals
            </div>
          )}
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
          <div className="mt-4 grid grid-cols-3 text-zinc-500">
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
                    {" "}
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
            {activities.map(({ signer, hasApproved }, i) => {
              return (
                <div
                  key={i}
                  className={`relative grid grid-cols-3 ${
                    !allSigners.includes(signer)
                      ? "before:absolute before:left-0 before:right-0 before:top-1/2 before:h-px before:w-full before:translate-y-px before:bg-zinc-300"
                      : ""
                  }`}
                >
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
              );
            })}
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
