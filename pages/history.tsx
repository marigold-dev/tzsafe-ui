import { InfoCircledIcon, TriangleDownIcon } from "@radix-ui/react-icons";
import { tzip16 } from "@taquito/tzip16";
import { validateContractAddress } from "@taquito/utils";
import { FC, useContext, useEffect, useMemo, useState } from "react";
import Alias from "../components/Alias";
import Spinner from "../components/Spinner";
import Tooltip from "../components/Tooltip";
import Meta from "../components/meta";
import Modal from "../components/modal";
import ProposalSignForm from "../components/proposalSignForm";
import fetchVersion from "../context/metadata";
import { getProposals, getTransfers } from "../context/proposals";
import {
  AppDispatchContext,
  AppStateContext,
  contractStorage,
} from "../context/state";
import {
  mutezTransfer,
  proposal,
  proposalContent,
  version,
} from "../types/display";
import { getProposalsId, toProposal, toStorage } from "../versioned/apis";

const emptyProps: [number, { og: any; ui: proposal }][] = [];

const Transfer: FC<{
  prop: mutezTransfer;
  address: string;
}> = ({ prop, address }) => {
  let state = useContext(AppStateContext)!;
  return (
    <div className="rounded bg-zinc-800 px-6 py-4">
      <div>
        <p className="font-bold text-white md:inline-block">
          Transaction: received Mutez{" "}
        </p>
      </div>
      <div>
        <p className="font-bold text-white md:inline-block">Sender: </p>
        <p className="md:text-md text-sm font-bold text-white md:inline-block">
          {state.aliases[prop.sender.address] || prop.sender.address}
        </p>
      </div>
      {prop.initiator && (
        <div>
          <p className="font-bold text-white md:inline-block">Initiator: </p>
          <p className="md:text-md text-sm font-bold text-white md:inline-block">
            {state.aliases[prop.initiator.address] || prop.initiator.address}
          </p>
        </div>
      )}
      <div>
        <p className="font-bold text-white md:inline-block">Target: </p>
        <p className="md:text-md text-sm font-bold text-white md:inline-block">
          {state.aliases[address] || address}
        </p>
      </div>
      <div>
        <p className="font-bold text-white md:inline-block">Amount(Mutez): </p>
        <p className="md:text-md text-sm font-bold text-white md:inline-block">
          {prop.amount}
        </p>
      </div>
      <div>
        <p className="font-bold text-white md:inline-block">Timestamp: </p>
        <p className="md:text-md text-sm font-bold text-white md:inline-block">
          {prop.timestamp}
        </p>
      </div>
    </div>
  );
};

type data = {
  label: undefined | string;
  metadata: undefined | string;
  amount: undefined | string;
  addresses: undefined | string[];
  entrypoints: undefined | string;
  params: undefined | string;
};

const renderProposalContent = (content: proposalContent, i: number) => {
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
      metadata: content.changeThreshold.toString(),
    };
  } else if ("adjustEffectivePeriod" in content) {
    data = {
      ...data,
      label: "Update proposal duration",
      metadata: content.adjustEffectivePeriod.toString(),
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

    if (!metadata.meta.includes("contract_addr")) {
      data = {
        ...data,
        label: "Execute lambda",
        metadata: metadata.meta,
      };
    } else {
      const contractData = JSON.parse(metadata.meta);
      const [endpoint, arg] = Object.entries(contractData.payload)[0];

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

type HistoryCardProps = {
  id: number;
  isOpen: boolean;
  onClick: () => void;
  status: string;
  date: Date;
  activities: { signer: string; hasApproved: boolean }[];
  content: proposalContent[];
  proposer: { actor: string; timestamp: string };
  resolver: { actor: string; timestamp: string } | undefined;
};

const HistoryCard = ({
  id,
  isOpen,
  onClick,
  status,
  date,
  activities,
  proposer,
  resolver,
  content,
}: HistoryCardProps) => {
  const proposalDate = new Date(proposer.timestamp);
  const resolveDate = new Date(resolver?.timestamp ?? 0);
  return (
    <div
      className={`${
        isOpen ? "h-auto" : "h-16"
      } w-full overflow-hidden rounded bg-zinc-800 text-white`}
    >
      <button
        className="grid h-16 w-full grid-cols-3 items-center gap-8 border-b border-zinc-900 px-6 py-4 lg:grid-cols-4"
        onClick={onClick}
      >
        <span className="justify-self-start font-bold">
          <span className="mr-4 font-light text-zinc-500">#{id}</span>
          {status ?? "Rejected"}
        </span>
        <span
          className="truncate font-light text-zinc-300"
          style={{
            minWidth: "7rem",
          }}
          title={content.map(labelOfProposalContent).join(", ")}
        >
          {content.map(labelOfProposalContent).join(", ")}
        </span>
        <span className="hidden justify-self-end lg:block">
          {date.toLocaleDateString()} -{" "}
          {`${date.getHours()}:${date.getMinutes()}`}
        </span>

        <div className="justify-self-end">
          <TriangleDownIcon
            className={`${isOpen ? "rotate-180" : ""} h-8 w-8`}
          />
        </div>
      </button>
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
            {content
              .filter(v => {
                return true;
                // if ("executeLambda" in v) {
                //   console.log(
                //     v.executeLambda.metadata?.includes("lambda unavailable")
                //   );
                //   return !v.executeLambda.metadata?.includes(
                //     "lambda unavailable"
                //   );
                // } else {
                //   return true;
                // }
              })
              .map(renderProposalContent)}
          </div>
        </section>
        <section>
          <span className="text-xl font-bold">Activity</span>
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

const History = () => {
  const state = useContext(AppStateContext)!;
  const dispatch = useContext(AppDispatchContext)!;

  const [openedPreview, setOpenPreview] = useState<{ [k: number]: boolean }>(
    {}
  );

  const [isLoading, setIsLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [contract, setContract] = useState<contractStorage>(
    state.contracts[state.currentContract ?? ""]
  );
  const [proposals, setProposals] = useState(emptyProps);
  const [transfers, setTransfers] = useState([] as mutezTransfer[]);
  const [openModal, setCloseModal] = useState<{
    state: number;
    proposal: [boolean | undefined, number];
  }>({
    state: 0,
    proposal: [undefined, 0],
  });

  useEffect(() => {
    if (!state.currentContract) return;

    if (validateContractAddress(state.currentContract) !== 3) {
      setInvalid(true);
      return;
    }

    (async () => {
      setIsLoading(true);
      if (!state.currentContract) return;

      let c = await state.connection.contract.at(state.currentContract, tzip16);
      let balance = await state.connection.tz.getBalance(state.currentContract);

      let cc = await c.storage();
      let version = await (state.contracts[state.currentContract]
        ? Promise.resolve<version>(
            state.contracts[state.currentContract].version
          )
        : fetchVersion(c));
      const updatedContract = toStorage(version, cc, balance);
      state.contracts[state.currentContract]
        ? dispatch({
            type: "updateContract",
            payload: {
              address: state.currentContract,
              contract: updatedContract,
            },
          })
        : null;
      let bigmap: { key: string; value: any }[] = await getProposals(
        getProposalsId(version, cc)
      );
      let transfers = await getTransfers(state.currentContract);
      let proposals: [number, any][] = bigmap.map(({ key, value }) => [
        Number.parseInt(key),
        { ui: toProposal(version, value), og: value },
      ]);
      setContract(updatedContract);
      setTransfers(transfers);
      setProposals(proposals);
      setIsLoading(false);
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentContract]);

  const filteredProposals = useMemo(
    () =>
      [
        ...proposals.filter(
          ([_, proposal]) => !("Proposing" === proposal.ui.status)
        ),
      ].concat(
        transfers
          .map(x => [-1, { ui: { timestamp: x.timestamp }, ...x }] as any)
          .sort(
            (a, b) =>
              Number(Date.parse(b[1].ui.timestamp).toString(10)) -
              Number(Date.parse(a[1].ui.timestamp).toString(10))
          )
      ),
    [proposals, transfers]
  );

  console.log("HERE:", filteredProposals);

  return (
    <div className="min-h-content relative flex grow flex-col">
      <Meta title={"History"} />
      <Modal opened={!!openModal.state}>
        {!!openModal.state && (
          <ProposalSignForm
            address={state.currentContract ?? ""}
            threshold={contract.threshold}
            version={contract.version}
            proposal={proposals.find(x => x[0] === openModal.proposal[1])![1]}
            state={openModal.proposal[0]}
            id={openModal.proposal[1]}
            closeModal={() => setCloseModal((s: any) => ({ ...s, state: 0 }))}
          />
        )}
      </Modal>
      <div>
        <div className="mx-auto flex max-w-7xl justify-start py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-extrabold text-white">History</h1>
        </div>
      </div>
      <main className="h-full min-h-fit grow">
        <div className="mx-auto h-full min-h-full max-w-7xl py-6 px-4 sm:px-6 lg:px-8">
          {!state.currentContract ? (
            <h2 className="text-center text-xl text-zinc-600">
              Please select a wallet in the sidebar
            </h2>
          ) : invalid ? (
            <div className="mx-auto flex w-full items-center justify-center bg-graybg p-2 shadow">
              <p className="mx-auto text-xl font-bold text-gray-800">
                Invalid contract address: {state.currentContract}
              </p>
            </div>
          ) : isLoading ? (
            <div className="mt-8 flex justify-center">
              <Spinner />
            </div>
          ) : filteredProposals.length === 0 ? (
            <h2 className="text-center text-xl text-zinc-600">
              History is empty
            </h2>
          ) : (
            filteredProposals.length > 0 && (
              <div className="space-y-6">
                {filteredProposals.map((x, i) => {
                  return x[0] == -1 ? (
                    <Transfer
                      address={state.currentContract ?? ""}
                      key={(x[1] as any).timestamp as any}
                      prop={x[1] as any}
                    />
                  ) : (
                    <HistoryCard
                      id={x[0]}
                      key={x[0]}
                      isOpen={!!openedPreview[i]}
                      onClick={() => {
                        setOpenPreview(v => ({ ...v, [i]: !(v[i] ?? false) }));
                      }}
                      status={x[1].ui.status}
                      date={new Date(x[1].ui.timestamp)}
                      activities={x[1].ui.signatures.map(
                        ({ signer, result }) => ({
                          hasApproved: result,
                          signer,
                        })
                      )}
                      content={x[1].ui.content}
                      proposer={x[1].og.proposer}
                      resolver={x[1].og.proposer}
                    />
                    // <ProposalCard
                    //   contract={contract}
                    //   id={x[0]}
                    //   key={x[0]}
                    //   prop={x[1]}
                    //   address={state.currentContract ?? ""}
                    //   signable={false}
                    // />
                  );
                })}
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
};

export default History;
