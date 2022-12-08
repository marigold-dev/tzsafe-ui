import { usePathname, useRouter } from "next/navigation";
import React, { useContext, useEffect, useState } from "react";
import Meta from "../../components/meta";
import Modal from "../../components/modal";
import NavBar from "../../components/navbar";
import TopUp from "../../components/topUpForm";
import { AppDispatchContext, AppStateContext } from "../../context/state";
import BigNumber from "bignumber.js"
import { BigMapAbstraction } from "@taquito/taquito";
import TransferForm from "../../components/transferForm";
import Proposals from "../../components/proposals";
import { proposal } from "../../context/types";
import { validateAddress } from "@taquito/utils"
let emptyProps: [number, proposal][] = []
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
                } = await c.storage()
                dispatch({
                    type: "updateContract", payload: {
                        address: router,
                        contract: {
                            balance: balance!.toString() || "0",
                            proposal_map: cc.proposal_map.toString(),
                            proposal_counter: cc.proposal_counter.toString(),
                            threshold: cc!.threshold.toNumber()!,
                            signers: cc!.signers!,
                        }
                    },
                })
                const proposals: [number, proposal][] = await fetch(new Request("https://api.ghostnet.tzkt.io/v1/bigmaps/215670/keys")).then((x) => x.json()).then(x => x.map((u: { value: proposal }, idx: number) => {
                    return ([idx, u.value])
                }));
                setContract({
                    contract: {
                        balance: balance?.toString() || "0",
                        proposal_map: cc.proposal_map.toString(),
                        proposal_counter: cc.proposal_counter.toString(),
                        threshold: cc?.threshold.toNumber()!,
                        signers: cc!.signers!,
                    }, proposals: proposals
                })
            })()
        }
        if (router && validateAddress(router) != 3) {
            setInvalid(true)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router])
    let alias = state.aliases[router]
    let [openModal, setCloseModal] = useState(0)
    return (
        <div>
            <Meta title={router} />
            <Modal opened={!!openModal} >
                {!!openModal && (() => {
                    switch (openModal) {
                        case 1:
                            return <TopUp closeModal={() => setCloseModal(0)} address={router} />
                        case 2:
                            return <TransferForm closeModal={() => setCloseModal(0)} address={router} />
                        default:
                            return null
                    }
                })()}
            </Modal>
            <NavBar />
            {invalid &&
                <div className="bg-white shadow p-2 w-full mx-auto flex justify-center items-center">
                    <p className="mx-auto font-bold text-xl text-gray-800">Invalid contract address: {router}</p>
                </div>}
            {!invalid && <div>
                <div className="bg-white shadow">
                    <div className="mx-auto max-w-7xl py-6 px-4 sm:px-6 lg:px-8 grid grid-flow-row grid-cols-1 md:grid-flow-row md:grid-cols-3  gap-1 justify-start">
                        {alias ? <div className="md:col-span-3">
                            <h1 className="text-black text-xl md:text-3xl font-bold md:col-span-3">
                                {alias}
                            </h1>
                            <div className="flex flex-row md:col-span-3">
                                <p className="text-black text-l md:text-xl font-bold">
                                    {router.slice(0, 6) +
                                        "..." +
                                        router.slice(-6)}
                                </p>
                                <button type="button" className="ml-2 rounded-md md:bg-indigo-600 p-1 text-gray-200 hover:text-white focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800" onClick={() => { navigator.clipboard.writeText(router) }}>
                                    <span className="sr-only">copy</span>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="fill-indigo-500 w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3l1.5 1.5 3-3.75" />
                                    </svg>
                                </button>
                            </div>
                            {contract.contract?.balance && <p className="text-black text-l md:text-xl font-bold">Balance: {contract?.contract?.balance} mutez</p>}
                            {contract.contract?.threshold && <p className="text-black text-l md:text-xl font-bold">Threshold: {contract?.contract?.threshold}/{contract?.contract?.signers.length}</p>}

                        </div> : <div className="md:col-span-3"><h1 className="text-black text-l md:text-3xl font-bold md:col-span-3">
                            {router}
                        </h1>
                            <button type="button" className="ml-2 rounded-md md:bg-indigo-600 p-1 text-gray-200 hover:text-white focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800" onClick={() => { navigator.clipboard.writeText(router) }}>
                                <span className="sr-only">copy</span>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="fill-indigo-500 w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3l1.5 1.5 3-3.75" />
                                </svg>
                            </button>
                            {contract.contract?.balance && <p className="text-black text-l md:text-xl font-bold">Balance: {contract?.contract?.balance} mutez</p>}
                            {contract.contract?.threshold && <p className="text-black text-l md:text-xl font-bold">Threshold: {contract?.contract?.threshold}/{contract?.contract?.signers.length}</p>}

                        </div>}
                        {state.address && <div>
                            <button
                                type="button"
                                onClick={e => {
                                    e.preventDefault();
                                    setCloseModal(1)
                                }}
                                className={
                                    " justify-self-end  w-full text-center row-span-1 max-w-full text-md md:text-xl items-center rounded-md py-2 px-2 md:py-1 md:px-2 font-bold text-gray-800 bg-gray-200 border-gray-800 hover:bg-gray-300 focus:bg-gray-300 hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
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
                                    " justify-self-end md:row-auto md:col-start-3 w-full text-center row-span-1 max-w-full text-md md:text-xl items-center rounded-md py-2 px-2 md:py-1 md:px-2 font-bold text-gray-800 bg-gray-200 border-gray-800 hover:bg-gray-300 focus:bg-gray-300 hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800"
                                }
                                id="user-menu-button"
                                aria-expanded="false"
                                aria-haspopup="true"
                            >
                                Create proposal
                            </button>
                        </div>}
                    </div>
                </div>
                <main className="min-h-full bg-gray-100">
                    <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
                        <div className="px-4 py-6 sm:px-0">
                            <div className="md:h-auto md:min-h-64 rounded-lg border-4 border-dashed border-gray-200 grid-rows-2 md:grid-cols-2 md:grid-rows-1 grid p-2">
                                {<Proposals proposals={contract?.proposals} address={router} />}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
            }
        </div >
    );
}



export default Home;
