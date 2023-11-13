import { tzip16 } from "@taquito/tzip16";
import { validateContractAddress, ValidationResult } from "@taquito/utils";
import { useContext, useEffect, useMemo, useReducer, useRef } from "react";
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

type proposals = [number, { og: any; ui: proposal }][];

type openModal = {
  state: number;
  proposal: [boolean | undefined, number];
};

type state = {
  isLoading: boolean;
  isInvalid: boolean;
  canFetchMore: boolean;
  isFetchingMore: boolean;
  proposals: proposals;
  transfers: [mutezTransfer[], tokenTransfer[]];
  openModal: openModal;
  offset: number;
  currentAddress: string | null;
  refreshCount: number;
};

type action =
  | { type: "setLoading"; payload: boolean }
  | { type: "setInvalid"; payload: boolean }
  | {
      type: "setProposals";
      payload: {
        proposals: proposals;
        address: string;
        transfers: [mutezTransfer[], tokenTransfer[]];
      };
    }
  | {
      type: "appendProposals";
      payload: {
        proposals: proposals;
        transfers: [mutezTransfer[], tokenTransfer[]];
      };
    }
  | { type: "setOpenModal"; payload: openModal }
  | { type: "setCanFetchMore"; payload: boolean }
  | { type: "setIsFetchingMore"; payload: boolean }
  | { type: "fetchMore" }
  | { type: "resetRefresh" }
  | { type: "stopLoadings" }
  | { type: "setOpenModalState"; payload: number };

const reducer = (state: state, action: action): state => {
  switch (action.type) {
    case "setLoading":
      return { ...state, isLoading: action.payload };
    case "setInvalid":
      return { ...state, isInvalid: action.payload };
    case "appendProposals":
      return {
        ...state,
        proposals: state.proposals.concat(action.payload.proposals),
        transfers: [
          state.transfers[0].concat(action.payload.transfers[0]),
          state.transfers[1].concat(action.payload.transfers[1]),
        ],
        isFetchingMore: false,
      };
    case "setProposals":
      return {
        ...state,
        proposals: action.payload.proposals,
        transfers: action.payload.transfers,
        currentAddress: action.payload.address,
        isLoading: false,
      };
    case "setOpenModal":
      return { ...state, openModal: action.payload };
    case "setOpenModalState":
      return {
        ...state,
        openModal: {
          ...state.openModal,
          state: action.payload,
        },
      };
    case "setCanFetchMore":
      return {
        ...state,
        canFetchMore: action.payload,
      };
    case "setIsFetchingMore":
      return {
        ...state,
        isFetchingMore: action.payload,
      };
    case "resetRefresh":
      return {
        ...state,
        refreshCount: state.refreshCount + 1,
        isLoading: true,
        offset: 0,
      };
    case "fetchMore":
      return {
        ...state,
        isFetchingMore: true,
        offset: state.offset + Versioned.FETCH_COUNT,
      };
    case "stopLoadings":
      return {
        ...state,
        isFetchingMore: false,
        isLoading: false,
      };
  }
};
const getLatestTimestamp = (og: {
  resolver: { timestamp: string } | undefined;
  proposer: { timestamp: string };
}) => (!!og.resolver ? og.resolver.timestamp : og.proposer.timestamp);

const History = () => {
  const globalState = useContext(AppStateContext)!;
  const globalDispatch = useContext(AppDispatchContext)!;

  const walletTokens = useWalletTokens();

  const [state, dispatch] = useReducer<typeof reducer>(reducer, {
    isLoading: true,
    isInvalid: false,
    canFetchMore: true,
    isFetchingMore: false,
    currentAddress: globalState.currentContract,
    proposals: [],
    transfers: [[], []],
    openModal: {
      state: 0,
      proposal: [undefined, 0],
    },
    offset: 0,
    refreshCount: 0,
  });

  const previousRefresherRef = useRef(-1);
  useEffect(() => {
    if (!globalState.currentContract) return;

    if (globalState.currentContract === state.currentAddress) return;

    dispatch({ type: "resetRefresh" });
  }, [globalState.currentContract]);

  useEffect(() => {
    if (!globalState.currentContract) return;

    if (
      !globalState.currentContract ||
      (globalState.currentContract === state.currentAddress &&
        previousRefresherRef.current === state.refreshCount &&
        !state.isFetchingMore)
    )
      return;

    if (
      validateContractAddress(globalState.currentContract) !==
      ValidationResult.VALID
    ) {
      dispatch({ type: "setInvalid", payload: true });
      return;
    }

    previousRefresherRef.current = state.refreshCount;

    (async () => {
      if (!globalState.currentContract) return;

      const c = await globalState.connection.contract.at(
        globalState.currentContract,
        tzip16
      );
      const balance = await globalState.connection.tz.getBalance(
        globalState.currentContract
      );

      const cc = (await c.storage()) as contractStorage;

      const version = await (globalState.contracts[globalState.currentContract]
        ? Promise.resolve<version>(
            globalState.contracts[globalState.currentContract].version
          )
        : fetchVersion(c));
      const updatedContract = toStorage(version, cc, balance);

      globalState.contracts[globalState.currentContract]
        ? globalDispatch({
            type: "updateContract",
            payload: {
              address: globalState.currentContract,
              contract: updatedContract,
            },
          })
        : null;

      cc.version = version;

      const bigmap = await Versioned.proposalsHistory(
        cc,
        globalState.currentContract,
        getProposalsId(version, cc),
        state.offset
      );

      const response = await Promise.all([
        getTransfers(globalState.currentContract, state.offset),
        getTokenTransfers(globalState.currentContract, state.offset),
      ]);

      if (
        bigmap.length < Versioned.FETCH_COUNT &&
        response[0].length < Versioned.FETCH_COUNT &&
        response[1].length < Versioned.FETCH_COUNT
      ) {
        dispatch({ type: "setCanFetchMore", payload: false });
      }

      const proposals: [number, any][] = bigmap.map(({ key, value }) => {
        return [
          version === "0.3.0" || version === "0.3.1" || version === "0.3.2"
            ? Number.parseInt(`0x${key}`)
            : Number.parseInt(key),
          { ui: toProposal(version, value), og: value },
        ];
      });

      dispatch(
        state.isFetchingMore
          ? {
              type: "appendProposals",
              payload: { proposals, transfers: response },
            }
          : {
              type: "setProposals",
              payload: {
                proposals,
                address: globalState.currentContract,
                transfers: response,
              },
            }
      );
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalState.currentContract, state.offset]);

  const filteredProposals = useMemo(
    () =>
      state.proposals
        .concat(
          state.transfers[0].map(
            x =>
              [
                TransferType.MUTEZ,
                { ui: { timestamp: x.timestamp }, ...x },
              ] as any
          )
        )
        .concat(
          state.transfers[1].map(
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
    [state.proposals, state.transfers]
  );

  return (
    <div className="min-h-content relative flex grow flex-col">
      <Meta title={"History - TzSafe"} />
      <Modal opened={!!state.openModal.state}>
        {!!state.openModal.state && (
          <ProposalSignForm
            address={globalState.currentContract ?? ""}
            threshold={
              (
                globalState.contracts[globalState.currentContract ?? ""] ??
                globalState.currentStorage
              ).threshold
            }
            version={
              (
                globalState.contracts[globalState.currentContract ?? ""] ??
                globalState.currentStorage
              ).version
            }
            proposal={
              state.proposals.find(
                x => x[0] === state.openModal.proposal[1]
              )![1]
            }
            state={state.openModal.proposal[0]}
            id={state.openModal.proposal[1]}
            closeModal={() =>
              dispatch({ type: "setOpenModalState", payload: 0 })
            }
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
          {!globalState.currentContract ? (
            <h2 className="text-center text-xl text-zinc-600">
              Please select a wallet in the sidebar
            </h2>
          ) : state.isInvalid ? (
            <div className="mx-auto flex w-full items-center justify-center bg-graybg p-2 shadow">
              <p className="mx-auto text-xl font-bold text-gray-800">
                Invalid contract address: {globalState.currentContract}
              </p>
            </div>
          ) : state.isLoading || !walletTokens ? (
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
                          key={(x[1] as any).timestamp}
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
                              ? new Date(
                                  x[1].og.resolver.timestamp ??
                                    x[1].og.resolver.Some.timestamp
                                )
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
                  }
                })}
                {state.canFetchMore && (
                  <div className="mt-4 flex w-full items-center justify-center">
                    {state.isFetchingMore ? (
                      <Spinner />
                    ) : (
                      <button
                        className="mx-auto rounded border-2 border-primary bg-primary px-4 py-2 text-white hover:border-red-500 hover:bg-red-500"
                        onClick={() => {
                          dispatch({ type: "fetchMore" });
                        }}
                      >
                        See more
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
};

export default History;
