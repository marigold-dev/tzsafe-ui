import { tzip16 } from "@taquito/tzip16";
import { validateContractAddress, ValidationResult } from "@taquito/utils";
import { useContext, useEffect, useReducer, useRef } from "react";
import ProposalCard from "../../components/ProposalCard";
import Spinner from "../../components/Spinner";
import Meta from "../../components/meta";
import Modal from "../../components/modal";
import ProposalSignForm from "../../components/proposalSignForm";
import fetchVersion from "../../context/metadata";
import { AppDispatchContext, AppStateContext } from "../../context/state";
import { proposal, version } from "../../types/display";
import { canExecute, canReject } from "../../utils/proposals";
import useIsOwner from "../../utils/useIsOwner";
import useWalletTokens from "../../utils/useWalletTokens";
import {
  getProposalsId,
  signers,
  toProposal,
  toStorage,
} from "../../versioned/apis";
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
  openModal: openModal;
  refreshCount: number;
  offset: number;
  currentAddress: string | null;
};

type action =
  | { type: "setLoading"; payload: boolean }
  | { type: "setInvalid"; payload: boolean }
  | { type: "setProposals"; payload: { proposals: proposals; address: string } }
  | { type: "appendProposals"; payload: { proposals: proposals } }
  | { type: "setOpenModal"; payload: openModal }
  | { type: "setCanFetchMore"; payload: boolean }
  | { type: "setIsFetchingMore"; payload: boolean }
  | { type: "fetchMore" }
  | { type: "refresh" }
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
        isFetchingMore: false,
      };
    case "setProposals":
      return {
        ...state,
        proposals: action.payload.proposals,
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
    case "refresh":
      return {
        ...state,
        refreshCount: state.refreshCount + 1,
        isLoading: true,
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

const emptyProposal = {
  og: {},
  ui: {
    author: "",
    status: "Executed",
    timestamp: "0",
    signatures: [],
    content: [],
  } as proposal,
};

const Proposals = () => {
  const globalState = useContext(AppStateContext)!;
  const globalDispatch = useContext(AppDispatchContext)!;
  const isOwner = useIsOwner();
  const walletTokens = useWalletTokens();

  const [state, dispatch] = useReducer<typeof reducer>(reducer, {
    isLoading: true,
    isInvalid: false,
    canFetchMore: true,
    isFetchingMore: false,
    currentAddress: globalState.currentContract,
    proposals: [],
    openModal: {
      state: 0,
      proposal: [undefined, 0],
    },
    refreshCount: 0,
    offset: 0,
  });

  const previousRefresherRef = useRef(-1);

  useEffect(() => {
    if (!globalState.currentContract) return;

    if (globalState.currentContract === state.currentAddress) return;

    dispatch({ type: "resetRefresh" });
  }, [globalState.currentContract]);

  useEffect(() => {
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

      const cc = await c.storage();

      const version = await (globalState.contracts[globalState.currentContract]
        ? Promise.resolve<version>(
            globalState.contracts[globalState.currentContract].version
          )
        : fetchVersion(c));

      const bigmap: { key: string; value: any }[] = await Versioned.proposals(
        getProposalsId(version, cc),
        state.offset
      );

      if (bigmap.length < Versioned.FETCH_COUNT) {
        dispatch({ type: "setCanFetchMore", payload: false });
      }

      const proposals: [number, any][] = bigmap.map(({ key, value }) => {
        return [
          version === "0.3.1" || version === "0.3.2"
            ? Number.parseInt(`0x${key}`)
            : Number.parseInt(key),
          { ui: toProposal(version, value), og: value },
        ];
      });

      if (globalState.contracts[globalState.currentContract ?? ""]) {
        const balance = await globalState.connection.tz.getBalance(
          globalState.currentContract
        );

        globalDispatch({
          type: "updateContract",
          payload: {
            address: globalState.currentContract,
            contract: toStorage(version, cc, balance),
          },
        });
      }
      dispatch(
        state.isLoading
          ? {
              type: "setProposals",
              payload: {
                proposals,
                address: globalState.currentContract,
              },
            }
          : { type: "appendProposals", payload: { proposals } }
      );
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    globalState.currentContract,
    state.refreshCount,
    state.offset,
    state.currentAddress,
  ]);

  const currentContract = globalState.currentContract ?? "";

  return (
    <div className="min-h-content relative flex grow flex-col">
      <Meta title={"Proposals - TzSafe"} />
      <Modal opened={!!state.openModal.state}>
        {!!state.openModal.state && (
          <ProposalSignForm
            address={currentContract}
            threshold={
              globalState.contracts[currentContract]?.threshold ??
              globalState.currentStorage?.threshold
            }
            version={
              globalState.contracts[currentContract]?.version ??
              globalState.currentStorage?.version
            }
            proposal={
              state.proposals.find(
                x => x[0] === state.openModal.proposal[1]
              )?.[1] ?? emptyProposal
            }
            state={state.openModal.proposal[0]}
            id={state.openModal.proposal[1]}
            closeModal={success => {
              if (success) {
                dispatch({ type: "refresh" });
              }
              dispatch({ type: "setOpenModalState", payload: 0 });
            }}
            walletTokens={walletTokens ?? []}
          />
        )}
      </Modal>
      <div>
        <div className="mx-auto flex max-w-7xl justify-start px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-extrabold text-white">Proposals</h1>
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
                Invalid contract address: {currentContract}
              </p>
            </div>
          ) : state.isLoading || !walletTokens ? (
            <div className="mt-8 flex justify-center">
              <Spinner />
            </div>
          ) : state.proposals.length === 0 ? (
            <h2 className="text-center text-xl text-zinc-600">
              {"There's currently no proposal"}
            </h2>
          ) : (
            <>
              <div className="space-y-6">
                {state.proposals.map(x => {
                  const effectivePeriod =
                    globalState.contracts[currentContract]?.effective_period ??
                    globalState.currentStorage?.effective_period;
                  const threshold =
                    globalState.contracts[currentContract]?.threshold ??
                    globalState.currentStorage?.threshold;

                  const deadline = new Date(
                    new Date(x[1].ui.timestamp).getTime() +
                      (!!effectivePeriod?.toNumber
                        ? effectivePeriod.toNumber()
                        : Number(effectivePeriod)) *
                        1000
                  );
                  const hasDeadlinePassed = Date.now() >= deadline.getTime();

                  const allSigners = !!globalState.contracts[currentContract]
                    ? signers(globalState.contracts[currentContract])
                    : !!globalState.currentStorage
                    ? signers(globalState.currentStorage)
                    : [];
                  const signatures = x[1].ui.signatures.filter(({ signer }) =>
                    allSigners.includes(signer)
                  );

                  const isExecutable = canExecute(signatures, threshold);

                  const isRejectable = canReject(
                    signatures,
                    threshold,
                    allSigners.length
                  );

                  const shouldResolve =
                    hasDeadlinePassed || isExecutable || isRejectable;

                  const hasSigned = !!signatures.find(
                    x => x.signer == globalState.address
                  );

                  return (
                    <ProposalCard
                      id={x[0]}
                      key={x[0]}
                      status={
                        hasDeadlinePassed ? (
                          "Expired"
                        ) : shouldResolve ? (
                          <span>
                            <span className="hidden lg:inline">
                              Waiting resolution
                            </span>
                            <span className="lg:hidden">Pending</span>
                          </span>
                        ) : hasSigned ? (
                          <span>
                            <span className="hidden lg:inline">
                              Waiting for signers
                            </span>
                            <span className="lg:hidden">Pending</span>
                          </span>
                        ) : (
                          x[1].ui.status
                        )
                      }
                      walletTokens={walletTokens}
                      date={deadline}
                      activities={x[1].ui.signatures.map(
                        ({ signer, result }) => ({
                          hasApproved: result,
                          signer,
                        })
                      )}
                      content={x[1].ui.content}
                      proposer={x[1].og.proposer}
                      resolver={x[1].og.resolver}
                      isSignable={
                        !!globalState.address &&
                        !!globalState.currentContract &&
                        isOwner &&
                        (!hasSigned || shouldResolve)
                      }
                      shouldResolve={shouldResolve}
                      setCloseModal={arg => {
                        dispatch({
                          type: "setOpenModal",
                          payload: { proposal: [arg, x[0]], state: 4 },
                        });
                      }}
                    />
                  );
                })}
              </div>
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
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Proposals;
