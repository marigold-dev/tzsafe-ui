import {
  AngleIcon,
  ArrowDownIcon,
  TriangleDownIcon,
} from "@radix-ui/react-icons";
import { tzip16 } from "@taquito/tzip16";
import { validateContractAddress } from "@taquito/utils";
import { FC, useContext, useEffect, useMemo, useState } from "react";
import Alias from "../components/Alias";
import ProposalCard from "../components/ProposalCard";
import Spinner from "../components/Spinner";
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
import { mutezTransfer, proposal, version } from "../types/display";
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

type HistoryCardProps = {
  id: number;
  isOpen: boolean;
  onClick: () => void;
  status: string;
  date: Date;
  activities: { signer: string; hasApproved: boolean }[];
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
        className="grid h-16 w-full grid-cols-4 items-center border-b border-zinc-900 px-6 py-4"
        onClick={onClick}
      >
        <span className="justify-self-start font-bold">
          <span className="mr-4 font-light text-zinc-500">#{id}</span>
          {status ?? "Pending"}
        </span>
        <span className="justify-self-start font-light text-zinc-300">
          10 mutez to tz1in...S4XB3wH
        </span>
        <span className="justify-self-end">
          {date.toLocaleDateString()} -{" "}
          {`${date.getHours()}:${date.getMinutes()}`}
        </span>

        <div className="justify-self-end">
          <TriangleDownIcon
            className={`${isOpen ? "rotate-180" : ""} h-8 w-8`}
          />
        </div>
      </button>
      <div className="px-6 py-4">
        <span className="text-xl font-light">Activity</span>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-3">
            <span className="justify-self-start font-light">
              {proposalDate.toLocaleDateString()} -{" "}
              {`${proposalDate.getHours()}:${proposalDate.getMinutes()}`}
            </span>
            <span className="justify-self-center font-bold">
              <Alias address={proposer.actor} />
            </span>
            <span className="justify-self-end font-bold">Proposed</span>
          </div>
          {activities.map(({ signer, hasApproved }) => (
            <div className="grid grid-cols-3">
              <span className="justify-self-start font-light text-zinc-500">
                -
                {/* {date.toLocaleDateString()} -{" "}
                {`${date.getHours()}:${date.getMinutes()}`} */}
              </span>
              <span className="justify-self-center font-bold">
                <Alias address={signer} />
              </span>
              <span className="justify-self-end font-bold">
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
              <span className="justify-self-center font-bold">
                <Alias address={resolver.actor} />
              </span>
              <span className="justify-self-end font-bold">Resolved</span>
            </div>
          )}
        </div>
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
      <Meta title={"Wallets"} />
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
                {filteredProposals.map(x => {
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
                      isOpen={!!openedPreview[0]}
                      onClick={() => {
                        setOpenPreview(v => ({ ...v, [0]: !(v[0] ?? false) }));
                      }}
                      status={x[1].ui.status}
                      date={new Date(x[1].ui.timestamp)}
                      activities={x[1].ui.signatures.map(
                        ({ signer, result }) => ({
                          hasApproved: result,
                          signer,
                        })
                      )}
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
