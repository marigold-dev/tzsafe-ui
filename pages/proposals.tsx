import { tzip16 } from "@taquito/tzip16";
import { validateContractAddress } from "@taquito/utils";
import { useContext, useEffect, useMemo, useState } from "react";
import ProposalCard from "../components/ProposalCard";
import Spinner from "../components/Spinner";
import Meta from "../components/meta";
import Modal from "../components/modal";
import ProposalSignForm from "../components/proposalSignForm";
import fetchVersion from "../context/metadata";
import { getProposals } from "../context/proposals";
import { AppStateContext } from "../context/state";
import { proposal, version } from "../types/display";
import { canExecute, canReject } from "../utils/proposals";
import useIsOwner from "../utils/useIsOwner";
import useWalletTokens from "../utils/useWalletTokens";
import { getProposalsId, signers, toProposal } from "../versioned/apis";

const emptyProps: [number, { og: any; ui: proposal }][] = [];

const Proposals = () => {
  const state = useContext(AppStateContext)!;
  const isOwner = useIsOwner();
  const walletTokens = useWalletTokens();

  const [isLoading, setIsLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [proposals, setProposals] = useState(emptyProps);
  const [openModal, setCloseModal] = useState<{
    state: number;
    proposal: [boolean | undefined, number];
  }>({
    state: 0,
    proposal: [undefined, 0],
  });
  const [refresher, setRefresher] = useState(0);

  useEffect(() => {
    if (!state.currentContract) return;

    if (validateContractAddress(state.currentContract) !== 3) {
      setInvalid(true);
      return;
    }

    setIsLoading(true);

    (async () => {
      if (!state.currentContract) return;

      let c = await state.connection.contract.at(state.currentContract, tzip16);

      let cc = await c.storage();
      let version = await (state.contracts[state.currentContract]
        ? Promise.resolve<version>(
            state.contracts[state.currentContract].version
          )
        : fetchVersion(c));

      let bigmap: { key: string; value: any }[] = await getProposals(
        getProposalsId(state.contracts[state.currentContract].version, cc)
      );
      let proposals: [number, any][] = bigmap.map(({ key, value }) => [
        Number.parseInt(key),
        { ui: toProposal(version, value), og: value },
      ]);

      setProposals(proposals);
      setIsLoading(false);
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentContract, refresher]);

  const filteredProposals = useMemo(
    () => [
      ...proposals.filter(
        ([_, proposal]) => "Proposing" === proposal.ui.status
      ),
    ],
    [proposals]
  );

  const currentContract = state.currentContract ?? "";

  return (
    <div className="min-h-content relative flex grow flex-col">
      <Meta title={"Proposals - TzSafe"} />
      <Modal opened={!!openModal.state}>
        {!!openModal.state && (
          <ProposalSignForm
            address={currentContract}
            threshold={state.contracts[currentContract]?.threshold}
            version={state.contracts[currentContract]?.version}
            proposal={proposals.find(x => x[0] === openModal.proposal[1])![1]}
            state={openModal.proposal[0]}
            id={openModal.proposal[1]}
            closeModal={() => setCloseModal((s: any) => ({ ...s, state: 0 }))}
            onSuccess={() => setRefresher(v => v + 1)}
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
              {"There's currently no proposal"}
            </h2>
          ) : (
            <div className="space-y-6">
              {filteredProposals
                .sort((a, b) => b[0] - a[0])
                .map(x => {
                  const effectivePeriod =
                    state.contracts[currentContract]?.effective_period;
                  const threshold = state.contracts[currentContract]?.threshold;

                  const deadline = new Date(
                    new Date(x[1].ui.timestamp).getTime() +
                      (!!effectivePeriod.toNumber
                        ? effectivePeriod.toNumber()
                        : Number(effectivePeriod)) *
                        1000
                  );
                  const hasDeadlinePassed = Date.now() >= deadline.getTime();

                  const isExecutable = canExecute(
                    x[1].ui.signatures,
                    threshold
                  );

                  const isRejectable = canReject(
                    x[1].ui.signatures,
                    threshold,
                    signers(state.contracts[currentContract]).length
                  );

                  const shouldResolve =
                    hasDeadlinePassed || isExecutable || isRejectable;

                  const hasSigned = !!x[1].ui.signatures.find(
                    x => x.signer == state.address
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
                              Waiting for resolution
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
                        isOwner &&
                        !!state.address &&
                        !!state.currentContract &&
                        (!hasSigned || shouldResolve)
                      }
                      shouldResolve={shouldResolve}
                      setCloseModal={arg => {
                        setCloseModal({ proposal: [arg, x[0]], state: 4 });
                      }}
                    />
                  );
                })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Proposals;
