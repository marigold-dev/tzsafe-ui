import { tzip16 } from "@taquito/tzip16";
import { validateContractAddress } from "@taquito/utils";
import { FC, useContext, useEffect, useMemo, useState } from "react";
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

const History = () => {
  let state = useContext(AppStateContext)!;
  let dispatch = useContext(AppDispatchContext)!;

  let [isLoading, setIsLoading] = useState(true);
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
      setIsLoading(false);
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentContract]);

  const filteredProposals = useMemo(
    () => [
      ...proposals.filter(
        ([_, proposal]) => !("Proposing" === proposal.ui.status)
      ),
    ],
    [proposals]
  );

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
                {filteredProposals
                  .concat(
                    transfers.map(
                      x => [-1, { ui: { timestamp: x.timestamp }, ...x }] as any
                    )
                  )
                  .sort(
                    (a, b) =>
                      Number(Date.parse(b[1].ui.timestamp).toString(10)) -
                      Number(Date.parse(a[1].ui.timestamp).toString(10))
                  )
                  .map(x => {
                    return x[0] == -1 ? (
                      <Transfer
                        address={state.currentContract ?? ""}
                        key={(x[1] as any).timestamp as any}
                        prop={x[1] as any}
                      />
                    ) : (
                      <ProposalCard
                        contract={contract}
                        id={x[0]}
                        key={x[0]}
                        prop={x[1]}
                        address={state.currentContract ?? ""}
                        signable={false}
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
