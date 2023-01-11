import { BigMapAbstraction, MichelsonMap } from "@taquito/taquito";
import { bytes2Char, tzip16 } from "@taquito/tzip16";
import { validateAddress } from "@taquito/utils";
import BigNumber from "bignumber.js";
import { usePathname } from "next/navigation";
import { FC, useContext, useEffect, useState } from "react";
import Footer from "../../components/footer";
import Meta from "../../components/meta";
import Modal from "../../components/modal";
import NavBar from "../../components/navbar";
import Proposals from "../../components/proposals";
import SignersForm from "../../components/signersForm";
import TopUp from "../../components/topUpForm";
import TransferForm from "../../components/transferForm";
import fetchVersion from "../../context/metadata";
import { AppDispatchContext, AppStateContext } from "../../context/state";
import { proposal, viewProposal } from "../../context/types";
let emptyProps: [number, viewProposal][] = []
const Spinner: FC<{ cond: boolean, value: string, text: string }> = ({ cond, value, text }) => {
    return cond ?
        <p className="text-white text-l md:text-xl font-bold">{text}: {value}</p> :
        <div className="flex flex-row">
            <span className="text-white text-l md:text-xl font-bold">{text}: </span>
            <div role="status" className="ml-4">
                <svg
                    aria-hidden="true"
                    className="mr-2 w-6 h-6 text-gray-200 animate-spin dark:text-gray-600 fill-red-600"
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
}
function Home() {
    let state = useContext(AppStateContext)!
    let dispatch = useContext(AppDispatchContext)!
    let [invalid, setInvalid] = useState(false)
    let router = usePathname()?.split("/")![2]!
    let [contract, setContract] = useState({ contract: state.contracts[router], proposals: emptyProps })

    useEffect(() => {
        if (router && validateAddress(router) === 3) {
            (async () => {
                let c = await state.connection.contract.at(router)
                let balance = await state.connection.tz.getBalance(router)
                let cc: {
                    proposal_counter: BigNumber;
                    proposal_map: BigMapAbstraction;
                    signers: string[];
                    threshold: BigNumber;
                    metadata: BigMapAbstraction
                } = await c.storage()

                let version = await fetchVersion(cc.metadata)
                dispatch({
                    type: "updateContract", payload: {
                        address: router,
                        contract: {
                            balance: balance!.toString() || "0",
                            proposal_map: cc.proposal_map.toString(),
                            proposal_counter: cc.proposal_counter.toString(),
                            threshold: cc!.threshold.toNumber()!,
                            signers: cc!.signers!,
                            version: version
                        }
                    },
                })
                let pp: MichelsonMap<BigNumber, viewProposal> = await c.contractViews.proposals([cc.proposal_counter.toNumber(), 0]).executeView({ source: state?.address || "", viewCaller: router });
                let proposals: [number, viewProposal][] = [...pp.entries()].map(([x, y]) => ([x.toNumber(), y]))
                setContract({
                    contract: {
                        balance: balance?.toString() || "0",
                        proposal_map: cc.proposal_map.toString(),
                        proposal_counter: cc.proposal_counter.toString(),
                        threshold: cc?.threshold.toNumber()!,
                        signers: cc!.signers!,
                        version: version
                    }, proposals: proposals
                })
            })()
        }
        if (router && validateAddress(router) != 3) {
            setInvalid(true)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router])
    useEffect(() => {
        async function updateProposals() {
            let c = await state.connection.contract.at(router)
            let pp: MichelsonMap<BigNumber, viewProposal> = await c.contractViews.proposals([state.contracts[router].proposal_counter + 1, 0]).executeView({ source: state?.address || "", viewCaller: router });
            let proposals: [number, viewProposal][] = [...pp.entries()].map(([x, y]) => ([x.toNumber(), y]))
            setContract(s => ({ ...s, proposals: proposals }))
        }
        let sub: any
        (async () => {
            if (router && validateAddress(router) === 3) {
                try {
                    sub = state.connection.stream.subscribeEvent({
                        address: router
                    });

                    sub.on('data', async (event: { tag: string; }) => {
                        switch (event.tag) {
                            case "create_proposal": {
                                await updateProposals()
                            }
                            case "sign_proposal": {
                                await updateProposals()
                            }
                            default:
                                null
                        }
                    });

                } catch (e) {
                    console.log(e);
                }
            }
        })();
        return () => {
            sub && sub.close()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router])
    let alias = state.aliases[router]
    let [openModal, setCloseModal] = useState(0)
    let balance = new BigNumber(contract?.contract?.balance);
    balance = balance.div(10 ** 6, 10);
    return (
        <div className="relative h-full flex flex-col overflow-y-auto">
            <Meta title={router} />
            <Modal opened={!!openModal} >
                {!!openModal && (() => {
                    switch (openModal) {
                        case 1:
                            return <TopUp closeModal={async () => {
                                let c = await state.connection.contract.at(router, tzip16)
                                let balance = await state.connection.tz.getBalance(router)
                                let cc: {
                                    proposal_counter: BigNumber;
                                    proposal_map: BigMapAbstraction;
                                    signers: string[];
                                    threshold: BigNumber;
                                    metadata: BigMapAbstraction
                                } = await c.storage()
                                let version = await fetchVersion(cc.metadata)
                                dispatch({
                                    type: "updateContract", payload: {
                                        address: router,
                                        contract: {
                                            balance: balance!.toString() || "0",
                                            proposal_map: cc.proposal_map.toString(),
                                            proposal_counter: cc.proposal_counter.toString(),
                                            threshold: cc!.threshold.toNumber()!,
                                            signers: cc!.signers!,
                                            version: version,
                                        }
                                    },
                                })
                                setContract(s => ({
                                    ...s,
                                    contract: {
                                        balance: balance?.toString() || "0",
                                        proposal_map: cc.proposal_map.toString(),
                                        proposal_counter: cc.proposal_counter.toString(),
                                        threshold: cc?.threshold.toNumber()!,
                                        signers: cc!.signers!,
                                        version: version,
                                    }
                                }))
                                setCloseModal(0)
                            }} address={router} />
                        case 2:
                            return <TransferForm closeModal={() => setCloseModal(0)} address={router} />
                        case 3:
                            return <SignersForm closeModal={() => setCloseModal(0)} address={router} />
                        default:
                            return null
                    }
                })()}
            </Modal>
            <NavBar />
            {invalid &&
                <div className="bg-graybg shadow p-2 w-full mx-auto flex justify-center items-center">
                    <p className="mx-auto font-bold text-xl text-gray-800">Invalid contract address: {router}</p>
                </div>}
            {!invalid && <div className="flex flex-col h-full grow overflow-y-auto">
                <div className="bg-graybg shadow">
                    <div className="mx-auto max-w-7xl py-6 px-4 sm:px-6 lg:px-8 grid grid-flow-row grid-cols-1 md:grid-flow-row md:grid-cols-3  gap-1 justify-start">
                        {alias ? <div className="md:col-span-3">
                            <h1 className="text-white text-xl md:text-3xl font-bold md:col-span-3">
                                {alias}
                            </h1>
                            <div className="flex flex-row md:col-span-3 items-center">
                                <p className="text-white text-l md:text-xl font-bold">
                                    {router.slice(0, 6) +
                                        "..." +
                                        router.slice(-6)}
                                </p>
                                <button type="button" className="ml-6  md:bg-primary p-1 text-gray-200 hover:text-white focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800 border-2 border-white" onClick={() => { navigator.clipboard.writeText(router) }}>
                                    <span className="sr-only">copy</span>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="fill-white w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3l1.5 1.5 3-3.75" />
                                    </svg>
                                </button>
                            </div>
                            <Spinner cond={!!contract.contract?.balance} value={balance.toString()} text={"Balance"} />
                            <Spinner cond={!!contract.contract?.threshold} value={`${contract?.contract?.threshold}/${contract?.contract?.signers.length}`} text={"Threshold"} />
                        </div> : <div className="md:col-span-3"><h1 className="text-white text-l md:text-3xl font-bold md:col-span-3">
                            {router}
                        </h1>
                            <button type="button" className="ml-2 rounded-md md:bg-primary p-1 text-gray-200 hover:text-white focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800" onClick={() => { navigator.clipboard.writeText(router) }}>
                                <span className="sr-only">copy</span>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="fill-white w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3l1.5 1.5 3-3.75" />
                                </svg>
                            </button>
                            <Spinner cond={!!contract.contract?.balance} value={balance.toString()} text={"Balance"} />
                            <Spinner cond={!!contract.contract?.threshold} value={`${contract?.contract?.threshold}/${contract?.contract?.signers.length}`} text={"Threshold"} />
                        </div>}
                        {state.address && <div>
                            <button
                                type="button"
                                onClick={e => {
                                    e.preventDefault();
                                    setCloseModal(1)
                                }}
                                className={
                                    " justify-self-end  w-full text-center row-span-1 max-w-full text-md md:text-xl items-center py-2 px-2 md:py-1 md:px-2 font-bold text-white border-gray-800 bg-primary  hover:bg-red-500 focus:bg-red-500 hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
                                }
                                id="user-menu-button"
                                aria-expanded="false"
                                aria-haspopup="true"
                            >
                                Top up wallet
                            </button>
                        </div>}
                        {state.address && contract.contract?.signers.includes(state?.address) && <div className="">
                            <button
                                type="button"
                                onClick={e => {
                                    e.preventDefault();
                                    setCloseModal(2)
                                }}
                                className={
                                    " justify-self-end md:row-auto md:col-start-3 w-full text-center row-span-1 max-w-full text-md md:text-xl items-center py-2 px-2 md:py-1 md:px-2 font-bold text-white border-gray-800 bg-primary  hover:bg-red-500 focus:bg-red-500 hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
                                }
                                id="user-menu-button"
                                aria-expanded="false"
                                aria-haspopup="true"
                            >
                                Create proposal
                            </button>
                        </div>}
                        {state.address && contract.contract?.signers.includes(state?.address) && <div className="">
                            <button
                                type="button"
                                onClick={e => {
                                    e.preventDefault();
                                    setCloseModal(3)
                                }}
                                className={
                                    " justify-self-end md:row-auto md:col-start-3 w-full text-center row-span-1 max-w-full text-md md:text-xl items-center py-2 px-2 md:py-1 md:px-2 font-bold text-white border-gray-800 bg-primary  hover:bg-red-500 focus:bg-red-500 hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
                                }
                                id="user-menu-button"
                                aria-expanded="false"
                                aria-haspopup="true"
                            >
                                Change owners and threshold
                            </button>
                        </div>}
                    </div>
                </div>
                <main className="bg-gray-100 h-full grow">
                    <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
                        <div className="px-4 py-6 sm:px-0">
                            <div className="md:h-auto md:min-h-64  border-4 border-dashed border-white md:grid-cols-2 md:grid-rows-1 grid p-2">
                                {<Proposals proposals={contract?.proposals} address={router} />}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
            }
            <Footer />
        </div >
    );
}



export default Home;
