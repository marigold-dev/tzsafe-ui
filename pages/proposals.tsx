import { tzip16 } from "@taquito/tzip16";
import { validateContractAddress } from "@taquito/utils";
import { useContext, useEffect, useState } from "react";
import ProposalCard from "../components/ProposalCard";
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

const Proposals = () => {
  let state = useContext(AppStateContext)!;
  let dispatch = useContext(AppDispatchContext)!;

  let [invalid, setInvalid] = useState(false);
  let [contract, setContract] = useState<contractStorage>(
    state.contracts[state.currentContract ?? ""]
  );
  let [proposals, setProposals] = useState(emptyProps);
  let [transfers, setTransfers] = useState([] as mutezTransfer[]);
  let [openModal, setCloseModal] = useState<{
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
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentContract]);

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
          <h1 className="text-2xl font-extrabold text-white">Proposals</h1>
        </div>
      </div>
      <main className="h-full min-h-fit grow">
        <div className="mx-auto h-full min-h-full max-w-7xl py-6 sm:px-6 lg:px-8">
          {[
            ...proposals.filter(
              ([_, proposal]) => "Proposing" === proposal.ui.status
            ),
          ]
            .sort((a, b) => b[0] - a[0])
            .map(x => (
              <ProposalCard
                contract={contract}
                id={x[0]}
                setCloseModal={(arg: boolean | undefined) =>
                  setCloseModal({ proposal: [arg, x[0]], state: 4 })
                }
                key={JSON.stringify(x[1])}
                prop={x[1]}
                address={state.currentContract ?? ""}
                signable={
                  !!state.address &&
                  !!!x[1].ui.signatures.find(x => x.signer == state.address) &&
                  true
                }
              />
            ))}
        </div>
      </main>
    </div>
  );
};

export default Proposals;
