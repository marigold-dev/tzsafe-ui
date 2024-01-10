import { tzip16 } from "@taquito/tzip16";
import Link from "next/link";
import React, { useContext, useEffect, useState } from "react";
import FormContext from "../../context/formContext";
import fetchVersion from "../../context/metadata";
import { AppDispatchContext, AppStateContext } from "../../context/state";
import { toStorage } from "../../versioned/apis";

function Success() {
  const { formState } = useContext(FormContext)!;
  let state = useContext(AppStateContext);
  let dispatch = useContext(AppDispatchContext);
  let [address, setAddress] = useState({
    status: 0,
    address: formState!.walletAddress!,
  });
  let [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (loading && address.status == 0) {
        try {
          let cc = await state?.connection.contract.at(address.address, tzip16);
          let storage = await cc?.storage()!;
          let balance = await state?.connection.tz.getBalance(address.address);
          let version = await fetchVersion(cc!);
          let v = toStorage(version, storage, balance!);

          setAddress({ address: address.address, status: 1 });
          setLoading(false);
          dispatch!({
            type: "addContract",
            payload: {
              aliases: Object.fromEntries([
                ...formState!.validators!.map(x => [x.address, x.name]),
                [address.address!, formState?.walletName || ""],
              ]),
              contract: v,
              address: address.address,
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
      <div
        role="status"
        className="mt-8 flex w-full items-center justify-center"
      >
        <svg
          aria-hidden="true"
          className="mr-2 h-8 w-8 animate-spin fill-red-600 text-zinc-200 dark:text-zinc-600"
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
    <div className="my-auto flex flex-col text-sm font-bold text-white md:text-xl">
      <p className="my-auto text-sm font-bold text-white md:text-xl">
        Wallet successfully imported!
      </p>
      <Link
        href={`/${address.address}/proposals`}
        onClick={() => {
          dispatch!({ type: "setCurrentContract", payload: address.address });
        }}
        className="text-md row-span-1 mt-4 w-full max-w-full items-center justify-self-end rounded bg-primary px-2 py-2 text-center font-bold text-white hover:bg-red-500 hover:outline-none focus:bg-red-500 md:px-2 md:py-1 md:text-xl"
      >
        Go to the wallet
      </Link>
    </div>
  ) : (
    <div className="my-auto text-xl font-bold text-zinc-800">{`Failed to import a wallet`}</div>
  );
}

export default Success;
