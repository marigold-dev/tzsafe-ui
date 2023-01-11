import React, { useContext, useEffect, useState } from "react";
import FormContext from "../../context/formContext";
import { AppDispatchContext, AppStateContext } from "../../context/state";
import contract from "../../context/unitContract";
import BigNumber from "bignumber.js";
import { BigMapAbstraction, MichelsonMap } from "@taquito/taquito";
import Link from "next/link";
import { bytes2Char, char2Bytes, tzip16 } from "@taquito/tzip16";
import fetchVersion from "../../context/metadata";
function Success() {
    const { formState } = useContext(FormContext)!;
    let state = useContext(AppStateContext);
    let dispatch = useContext(AppDispatchContext);
    let [address, setAddress] = useState({ status: 0, address: "" });
    let [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            if (loading && address.status == 0) {
                try {
                    const metadataMap = new MichelsonMap();
                    metadataMap.set(
                        "version",
                        char2Bytes("0.0.6")
                    );
                    let deploy = await state?.connection.wallet
                        .originate({
                            code: contract,
                            storage: {
                                proposal_counter: 0,
                                proposal_map: [],
                                signers: formState!.validators.map((x) => x.address),
                                threshold: formState!.requiredSignatures,
                                metadata: metadataMap,
                            },
                        })
                        .send();
                    let result1 = await deploy?.contract();
                    let c: {
                        proposal_counter: BigNumber;
                        proposal_map: BigMapAbstraction;
                        signers: string[];
                        metadata: BigMapAbstraction
                    } = await result1!.storage()
                    let version = await fetchVersion(c.metadata);
                    let balance = await state?.connection.tz.getBalance(
                        result1!.address!
                    );
                    setAddress({ address: result1?.address!, status: 1 });
                    setLoading(false);
                    dispatch!({
                        type: "addContract",
                        payload: {
                            aliases: Object.fromEntries([
                                ...formState!.validators!.map((x) => [x.address, x.name]),
                                [result1?.address!, formState?.walletName || ""],
                            ]),
                            contract: {
                                balance: balance?.toString() || "0",
                                proposal_map: c.proposal_map.toString(),
                                proposal_counter: c.proposal_counter.toString(),
                                threshold: formState?.requiredSignatures!,
                                signers: formState!.validators!.map((x) => x.address),
                                version: version
                            },
                            address: result1!.address!,
                        },
                    });
                } catch (err) {
                    console.log(err);
                    setAddress({ status: -1, address: "" });
                    setLoading(false);
                }
            }
        })();
    }, [formState, state, address, loading, dispatch]);
    if (loading) {
        return (
            <div role="status">
                <svg
                    aria-hidden="true"
                    className="mr-2 w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-red-600"
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
        );
    }
    return address.status === 1 ? (
        <div className="text-sm md:text-xl my-auto text-white font-bold flex flex-col">
            <p className="text-sm md:text-xl my-auto text-white font-bold">
                {`Wallet successfully created! ${address.address}`}
            </p>
            <Link
                href={`/wallets/${address.address}`}
                className="justify-self-end  w-full text-center row-span-1 max-w-full text-md md:text-xl items-center py-2 px-2 md:py-1 md:px-2 font-bold text-white border-gray-800 bg-primary  hover:bg-red-500 focus:bg-red-500 hover:outline-none border-2 hover:border-gray-800  hover:border-offset-2  hover:border-offset-gray-800">
                Go to the wallet
            </Link>
        </div>
    ) : (
        <div className="text-xl my-auto text-white font-bold">{`Failed to originate a wallet`}</div>
    );
}

export default Success;
