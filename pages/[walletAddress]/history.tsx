import { tzip16 } from "@taquito/tzip16";
import { validateContractAddress } from "@taquito/utils";
import { useContext, useEffect, useMemo, useState } from "react";
import Alias from "../../components/Alias";
import HistoryFaToken from "../../components/HistoryFaToken";
import ProposalCard from "../../components/ProposalCard";
import Spinner from "../../components/Spinner";
import Meta from "../../components/meta";
import Modal from "../../components/modal";
import ProposalSignForm from "../../components/proposalSignForm";
import fetchVersion from "../../context/metadata";
import { getTokenTransfers, getTransfers } from "../../context/proposals";
import {
  AppDispatchContext,
  AppStateContext,
  contractStorage,
} from "../../context/state";
import {
  TransferType,
  mutezTransfer,
  proposal,
  tokenTransfer,
  version,
} from "../../types/display";
import { mutezToTez } from "../../utils/tez";
import useWalletTokens from "../../utils/useWalletTokens";
import { getProposalsId, toProposal, toStorage } from "../../versioned/apis";
import { Versioned } from "../../versioned/interface";

const emptyProps: [number, { og: any; ui: proposal }][] = [];

const getLatestTimestamp = (og: {
  resolver: { timestamp: string } | undefined;
  proposer: { timestamp: string };
}) => (!!og.resolver ? og.resolver.timestamp : og.proposer.timestamp);

const History = () => {
  const state = useContext(AppStateContext)!;
  const dispatch = useContext(AppDispatchContext)!;

  const walletTokens = useWalletTokens();

  const [isLoading, setIsLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [contract, setContract] = useState<contractStorage>(
    state.contracts[state.currentContract ?? ""]
  );
  const [proposals, setProposals] = useState(emptyProps);
  const [transfers, setTransfers] = useState<
    [mutezTransfer[], tokenTransfer[]]
  >([[], []]);
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

      const c = await state.connection.contract.at(
        state.currentContract,
        tzip16
      );
      const balance = await state.connection.tz.getBalance(
        state.currentContract
      );

      const cc = (await c.storage()) as contractStorage;

      const version = await (state.contracts[state.currentContract]
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

      const bigmap: { key: string; value: any }[] =
        await Versioned.proposalsHistory(cc, getProposalsId(version, cc));
      const response = await Promise.all([
        getTransfers(state.currentContract),
        getTokenTransfers(state.currentContract),
      ]);
      const proposals: [number, any][] = bigmap.map(({ key, value }) => [
        Number(`0x${key}`),
        { ui: toProposal(version, value), og: value },
      ]);
      setContract(updatedContract);
      setTransfers(response);
      setProposals(proposals);
      setIsLoading(false);
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentContract]);

  const filteredProposals = useMemo(
    () =>
      proposals
        .concat(
          transfers[0].map(
            x =>
              [
                TransferType.MUTEZ,
                { ui: { timestamp: x.timestamp }, ...x },
              ] as any
          )
        )
        .concat(
          transfers[1].map(
            x =>
              [
                x.token.standard === "fa2"
                  ? TransferType.FA2
                  : x.token.standard === "fa1.2"
                  ? TransferType.FA1_2
                  : TransferType.UNKNOWN,
                { ui: { timestamp: x.timestamp }, ...x },
              ] as any
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
            walletTokens={walletTokens ?? []}
          />
        )}
      </Modal>
      <div>
        <div className="mx-auto flex max-w-7xl justify-start px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-extrabold text-white">History</h1>
        </div>
      </div>
      <main className="min-h-fit grow">
        <div className="mx-auto min-h-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
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
          ) : isLoading || !walletTokens ? (
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
                  switch (x[0]) {
                    case TransferType.MUTEZ:
                      return (
                        <div
                          key={(x[1] as any).timestamp}
                          className="grid h-16 w-full grid-cols-3 items-center gap-8 rounded border-b border-zinc-900 bg-zinc-800 px-6 py-4 text-white lg:grid-cols-4"
                        >
                          <span className="justify-self-start font-bold md:ml-11">
                            <span className="hidden md:block">
                              Received Tez
                            </span>
                            <span className="md:hidden">Received</span>
                          </span>
                          <span className="text-center font-light text-zinc-300 md:min-w-[7rem] md:text-left">
                            <span className="hidden md:inline">From:</span>{" "}
                            <Alias address={(x[1] as any).sender.address} />
                          </span>
                          <span className="truncate font-light text-zinc-300 md:min-w-[7rem]">
                            <span className="hidden md:inline">Amount:</span>{" "}
                            {mutezToTez((x[1] as any).amount)} Tez
                          </span>
                          <span className="hidden justify-self-end lg:block">
                            {new Date(
                              (x[1] as any).timestamp
                            ).toLocaleDateString()}{" "}
                            -{" "}
                            {`${new Date((x[1] as any).timestamp)
                              .getHours()
                              .toString()
                              .padStart(2, "0")}:${new Date(
                              (x[1] as any).timestamp
                            )
                              .getMinutes()
                              .toString()
                              .padStart(2, "0")}`}
                          </span>
                        </div>
                      );
                    case TransferType.FA2:
                    case TransferType.FA1_2:
                      return (
                        <HistoryFaToken
                          transferType={x[0]}
                          token={x[1] as any}
                        />
                      );

                    case TransferType.UNKNOWN:
                      return null;
                    default:
                      return (
                        <ProposalCard
                          id={x[0]}
                          key={x[0]}
                          metadataRender
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
                          walletTokens={walletTokens}
                        />
                      );
                      break;
                  }
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
