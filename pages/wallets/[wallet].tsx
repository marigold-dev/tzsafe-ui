import { tzip16 } from "@taquito/tzip16";
import { validateContractAddress } from "@taquito/utils";
import BigNumber from "bignumber.js";
import { usePathname } from "next/navigation";
import { useContext, useEffect, useState, FC } from "react";
import Meta from "../../components/meta";
import Modal from "../../components/modal";
import ProposalSignForm from "../../components/proposalSignForm";
import Proposals from "../../components/proposals";
import SignersForm from "../../components/signersForm";
import TopUp from "../../components/topUpForm";
import TransferForm from "../../components/transferForm";
import fetchVersion from "../../context/metadata";
import { getProposals, getTransfers } from "../../context/proposals";
import {
  AppDispatchContext,
  AppStateContext,
  contractStorage,
} from "../../context/state";
import { mutezTransfer, proposal, version } from "../../types/display";
import { adaptiveTime } from "../../utils/adaptiveTime";
import {
  signers,
  toProposal,
  toStorage,
  getProposalsId,
} from "../../versioned/apis";

let emptyProps: [number, { og: any; ui: proposal }][] = [];
const Spinner: FC<{ cond: boolean; value: string; text: string }> = ({
  cond,
  value,
  text,
}) => {
  return cond ? (
    <p className="text-l font-bold text-white md:text-xl">
      {text}: {value}
    </p>
  ) : (
    <div className="flex flex-row">
      <span className="text-l font-bold text-white md:text-xl">{text}: </span>
      <div role="status" className="ml-4">
        <svg
          aria-hidden="true"
          className="text-gray-200 dark:text-gray-600 mr-2 h-6 w-6 animate-spin fill-red-600"
          viewBox="0 0 100 101"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
            fill="currentColor"
          />
          <path
            d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
            fill="currentFill"
          />
        </svg>
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
};
function Wallet(props: { address: string }) {
  let router = props.address;
  let state = useContext(AppStateContext)!;
  let dispatch = useContext(AppDispatchContext)!;
  let [invalid, setInvalid] = useState(false);
  let [contract, setContract] = useState<contractStorage>(
    state.contracts[router]
  );
  let [proposals, setProposals] = useState(emptyProps);
  let [transfers, setTransfers] = useState([] as mutezTransfer[]);

  useEffect(() => {
    if (router && validateContractAddress(router) === 3) {
      (async () => {
        let c = await state.connection.contract.at(router, tzip16);
        let balance = await state.connection.tz.getBalance(router);

        let cc = await c.storage();
        let version = await (state.contracts[router]
          ? Promise.resolve<version>(state.contracts[router].version)
          : fetchVersion(c));
        const updatedContract = toStorage(version, cc, balance);
        state.contracts[router]
          ? dispatch({
              type: "updateContract",
              payload: {
                address: router,
                contract: updatedContract,
              },
            })
          : null;
        let bigmap: { key: string; value: any }[] = await getProposals(
          getProposalsId(version, cc)
        );
        let transfers = await getTransfers(router);
        let proposals: [number, any][] = bigmap.map(({ key, value }) => [
          Number.parseInt(key),
          { ui: toProposal(version, value), og: value },
        ]);
        setContract(updatedContract);
        setTransfers(transfers);
        setProposals(proposals);
      })();
    }
    if (router && validateContractAddress(router) != 3) {
      setInvalid(true);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);
  useEffect(() => {
    async function updateProposals() {
      let c = await state.connection.contract.at(router, tzip16);
      let cc = await c.storage();
      let balance = await state.connection.tz.getBalance(router);
      let version = await (state.contracts[router]
        ? Promise.resolve<version>(state.contracts[router].version)
        : fetchVersion(c));

      const updatedContract = toStorage(version, cc, balance);
      let bigmap: { key: string; value: any }[] = await getProposals(
        getProposalsId(version, cc)
      );
      let transfers = await getTransfers(router);

      let proposals: [number, any][] = bigmap.map(({ key, value }) => [
        Number.parseInt(key),
        { ui: toProposal(version, value), og: value },
      ]);
      setContract(updatedContract);
      setTransfers(transfers);
      setProposals(proposals);
    }
    let sub: any;
    (async () => {
      if (router && validateContractAddress(router) === 3) {
        try {
          sub = state.connection.stream.subscribeEvent({
            address: router,
          });

          sub.on("data", async (event: { tag: string }) => {
            switch (event.tag) {
              case "default": {
                await updateProposals();
                break;
              }
              case "create_proposal": {
                await updateProposals();
                break;
              }
              case "sign_proposal": {
                await updateProposals();
                break;
              }
              case "execute_proposal": {
                await updateProposals();
                break;
              }
              case "resolve_proposal": {
                await updateProposals();
                break;
              }
              default:
                console.log("unknown event");
                null;
            }
          });
        } catch (e) {
          console.log(e);
        }
      }
    })();
    return () => {
      sub && sub.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);
  let alias = state.aliases[router];
  let [openModal, setCloseModal] = useState<{
    state: number;
    proposal: [boolean | undefined, number];
  }>({
    state: 0,
    proposal: [undefined, 0],
  });

  let balance = new BigNumber(contract?.balance);
  balance = balance.div(10 ** 6, 10);
  return (
    <div className="relative flex min-h-fit grow flex-col overflow-y-auto">
      <Meta title={router} />
      <Modal opened={!!openModal.state}>
        {!!openModal.state &&
          (() => {
            switch (openModal.state) {
              case 1:
                return (
                  <TopUp
                    closeModal={async (c: contractStorage) => {
                      setContract((s: contractStorage) => ({
                        ...s,
                        contract: c,
                      }));
                      setCloseModal((s: any) => ({ ...s, state: 0 }));
                    }}
                    address={router}
                  />
                );
              case 2:
                return (
                  <TransferForm
                    contract={contract}
                    closeModal={() =>
                      setCloseModal((s: any) => ({ ...s, state: 0 }))
                    }
                    address={router}
                  />
                );
              case 3:
                return (
                  <SignersForm
                    contract={contract}
                    closeModal={() =>
                      setCloseModal((s: any) => ({ ...s, state: 0 }))
                    }
                    address={router}
                  />
                );
              case 4:
                return (
                  <ProposalSignForm
                    address={router}
                    threshold={contract.threshold}
                    version={contract.version}
                    proposal={
                      proposals.find(x => x[0] === openModal.proposal[1])![1]
                    }
                    state={openModal.proposal[0]}
                    id={openModal.proposal[1]}
                    closeModal={() =>
                      setCloseModal((s: any) => ({ ...s, state: 0 }))
                    }
                  />
                );
              default:
                return null;
            }
          })()}
      </Modal>
      {invalid && (
        <div className="mx-auto flex w-full items-center justify-center bg-graybg p-2 shadow">
          <p className="text-gray-800 mx-auto text-xl font-bold">
            Invalid contract address: {router}
          </p>
        </div>
      )}
      {!invalid && (
        <div className="flex h-full min-h-fit grow flex-col">
          <div className="bg-graybg shadow">
            <div className="mx-auto grid max-w-7xl grid-flow-row grid-cols-1 justify-start gap-1 py-6 px-4 sm:px-6 md:grid-flow-row  md:grid-cols-3 lg:px-8">
              {alias ? (
                <div className="md:col-span-3">
                  <h1 className="text-xl font-bold text-white md:col-span-3 md:text-3xl">
                    {alias}
                  </h1>
                  <div className="flex flex-row items-center md:col-span-3">
                    <p className="text-l font-bold text-white md:text-xl">
                      {router.slice(0, 6) + "..." + router.slice(-6)}
                    </p>
                    <button
                      type="button"
                      className="text-gray-200  focus:ring-offset-gray-800 ml-6 border-2 border-white p-1 hover:text-white focus:ring-white focus:ring-offset-2 md:bg-primary"
                      onClick={() => {
                        navigator.clipboard.writeText(router);
                      }}
                    >
                      <span className="sr-only">copy</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="h-6 w-6 fill-white"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3l1.5 1.5 3-3.75"
                        />
                      </svg>
                    </button>
                  </div>
                  <Spinner
                    cond={!!contract?.version}
                    value={contract?.version}
                    text={"Version"}
                  />
                  <Spinner
                    key={contract?.balance}
                    cond={!!contract?.balance}
                    value={`${balance.toString()} xtz`}
                    text={"Balance"}
                  />
                  <Spinner
                    key={contract?.threshold}
                    cond={!!contract?.threshold}
                    value={`${contract?.threshold}/${signers(contract).length}`}
                    text={"Threshold"}
                  />
                  {contract?.effective_period && (
                    <Spinner
                      key={contract?.effective_period}
                      cond={!!contract?.effective_period}
                      value={
                        contract?.effective_period
                          ? adaptiveTime(contract?.effective_period)
                          : "forever"
                      }
                      text={"Effective period"}
                    />
                  )}
                </div>
              ) : (
                <div className="md:col-span-3">
                  <h1 className="text-l font-bold text-white md:col-span-3 md:text-3xl">
                    {router}
                  </h1>
                  <button
                    type="button"
                    className="text-gray-200 focus:ring-offset-gray-800 ml-2 rounded-md p-1 hover:text-white focus:ring-white focus:ring-offset-2 md:bg-primary"
                    onClick={() => {
                      navigator.clipboard.writeText(router);
                    }}
                  >
                    <span className="sr-only">copy</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="h-6 w-6 fill-white"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3l1.5 1.5 3-3.75"
                      />
                    </svg>
                  </button>
                  <Spinner
                    cond={!!contract?.version}
                    value={contract?.version}
                    text={"Version"}
                  />
                  <Spinner
                    key={contract?.balance}
                    cond={!!contract?.balance}
                    value={`${balance.toString()} xtz`}
                    text={"Balance"}
                  />
                  <Spinner
                    key={contract?.threshold}
                    cond={!!contract?.threshold}
                    value={`${contract?.threshold}/${signers(contract).length}`}
                    text={"Threshold"}
                  />
                  {contract?.effective_period && (
                    <Spinner
                      key={contract?.effective_period}
                      cond={!!contract?.effective_period}
                      value={
                        contract?.effective_period
                          ? adaptiveTime(contract?.effective_period)
                          : "forever"
                      }
                      text={"Effective period"}
                    />
                  )}
                </div>
              )}
              {state.address && (
                <div>
                  <button
                    type="button"
                    onClick={e => {
                      e.preventDefault();
                      setCloseModal((s: any) => ({ ...s, state: 1 }));
                    }}
                    className={
                      " text-md  border-gray-800 hover:border-gray-800 hover:border-offset-2 hover:border-offset-gray-800 row-span-1 w-full max-w-full items-center justify-self-end border-2 bg-primary py-2 px-2 text-center font-bold  text-white hover:bg-red-500 hover:outline-none focus:bg-red-500 md:py-1  md:px-2  md:text-xl"
                    }
                    id="user-menu-button"
                    aria-expanded="false"
                    aria-haspopup="true"
                  >
                    Top up wallet
                  </button>
                </div>
              )}
              {state.address && signers(contract).includes(state?.address) && (
                <div className="">
                  <button
                    type="button"
                    onClick={e => {
                      e.preventDefault();
                      setCloseModal((s: any) => ({ ...s, state: 2 }));
                    }}
                    className={
                      " text-md border-gray-800 hover:border-gray-800 hover:border-offset-2 hover:border-offset-gray-800 row-span-1 w-full max-w-full items-center justify-self-end border-2 bg-primary py-2 px-2 text-center font-bold text-white hover:bg-red-500  hover:outline-none focus:bg-red-500 md:col-start-3 md:row-auto md:py-1  md:px-2  md:text-xl"
                    }
                    id="user-menu-button"
                    aria-expanded="false"
                    aria-haspopup="true"
                  >
                    Create proposal
                  </button>
                </div>
              )}
              {state.address && signers(contract).includes(state?.address) && (
                <div className="">
                  <button
                    type="button"
                    onClick={e => {
                      e.preventDefault();
                      setCloseModal((s: any) => ({ ...s, state: 3 }));
                    }}
                    className={
                      " text-md border-gray-800 hover:border-gray-800 hover:border-offset-2 hover:border-offset-gray-800 row-span-1 w-full max-w-full items-center justify-self-end border-2 bg-primary py-2 px-2 text-center font-bold text-white hover:bg-red-500  hover:outline-none focus:bg-red-500 md:col-start-3 md:row-auto md:py-1  md:px-2  md:text-xl"
                    }
                    id="user-menu-button"
                    aria-expanded="false"
                    aria-haspopup="true"
                  >
                    Change settings
                  </button>
                </div>
              )}
            </div>
          </div>
          <main className="bg-gray-100 h-full min-h-fit grow">
            <div className="mx-auto h-full min-h-full max-w-7xl py-6 sm:px-6 lg:px-8">
              <div className="h-full min-h-full px-4 py-6 sm:px-0">
                <div className="grid h-fit  min-h-fit grid-cols-1 border-4 border-dashed border-white p-2 md:grid-cols-2 md:grid-rows-1">
                  <Proposals
                    setCloseModal={(
                      proposal: number,
                      arg: boolean | undefined
                    ) => setCloseModal({ proposal: [arg, proposal], state: 4 })}
                    transfers={transfers}
                    proposals={proposals}
                    contract={contract}
                    address={router}
                  />
                </div>
              </div>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
function Home() {
  let pathname = usePathname();
  let router = (() => {
    try {
      return pathname?.split("/")![2]!;
    } catch (e) {
      return undefined;
    }
  })();

  return <Wallet address={router!} />;
}
export default Home;
export { Wallet };
