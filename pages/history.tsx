import { InfoCircledIcon, TriangleDownIcon } from "@radix-ui/react-icons";
import { tzip16 } from "@taquito/tzip16";
import { validateContractAddress } from "@taquito/utils";
import { useContext, useEffect, useMemo, useState } from "react";
import Alias from "../components/Alias";
import ProposalCard from "../components/ProposalCard";
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

const getLatestTimestamp = (og: {
  resolver: { timestamp: string } | undefined;
  proposer: { timestamp: string };
}) => (!!og.resolver ? og.resolver.timestamp : og.proposer.timestamp);

const History = () => {
  const state = useContext(AppStateContext)!;
  const dispatch = useContext(AppDispatchContext)!;

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
      ]
        .concat(
          transfers.map(
            x => [-1, { ui: { timestamp: x.timestamp }, ...x }] as any
          )
        )
        .sort((a, b) => {
          const date1 = !!(a[1] as any).timestamp
            ? new Date((a[1] as any).timestamp).getTime()
            : new Date(getLatestTimestamp(a[1].og)).getTime();

          const date2 = !!(b[1] as any).timestamp
            ? new Date((b[1] as any).timestamp).getTime()
            : new Date(getLatestTimestamp(b[1].og)).getTime();

          return date2 - date1;
        }),
    [proposals, transfers]
  );

  return (
    <div className="min-h-content relative flex grow flex-col">
      <Meta title={"History - TzSafe"} />
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
      <main className="min-h-fit grow">
        <div className="mx-auto min-h-full max-w-7xl py-6 px-4 sm:px-6 lg:px-8">
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
                    <div
                      key={(x[1] as any).timestamp}
                      className="grid h-16 w-full w-full grid-cols-3 items-center gap-8 rounded border-b border-zinc-900 bg-zinc-800 px-6 py-4 text-white lg:grid-cols-4"
                    >
                      <span className="justify-self-start font-bold md:ml-11">
                        <span className="hidden md:block">Received mutez</span>
                        <span className="md:hidden">Received</span>
                      </span>
                      <span className="text-center font-light text-zinc-300 md:min-w-[7rem] md:text-left">
                        <span className="hidden md:inline">From:</span>{" "}
                        <Alias address={(x[1] as any).sender.address} />
                      </span>
                      <span className="truncate font-light text-zinc-300 md:min-w-[7rem]">
                        <span className="hidden md:inline">Amount:</span>{" "}
                        {(x[1] as any).amount} mutez
                      </span>
                      <span className="hidden justify-self-end lg:block">
                        {new Date((x[1] as any).timestamp).toLocaleDateString()}{" "}
                        -{" "}
                        {`${new Date((x[1] as any).timestamp)
                          .getHours()
                          .toString()
                          .padStart(2, "0")}:${new Date((x[1] as any).timestamp)
                          .getMinutes()
                          .toString()
                          .padStart(2, "0")}`}
                      </span>
                    </div>
                  ) : (
                    <ProposalCard
                      id={x[0]}
                      key={x[0]}
                      status={x[1].ui.status}
                      date={
                        !!x[1].og.resolver
                          ? new Date(x[1].og.resolver.timestamp)
                          : new Date(x[1].ui.timestamp)
                      }
                      activities={x[1].ui.signatures.map(
                        ({ signer, result }) => ({
                          hasApproved: result,
                          signer,
                        })
                      )}
                      content={x[1].ui.content}
                      proposer={x[1].og.proposer}
                      resolver={x[1].og.resolver}
                    />
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
