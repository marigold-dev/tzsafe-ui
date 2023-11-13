import { NetworkType } from "@airgap/beacon-sdk";
import BigNumber from "bignumber.js";
import { useRouter } from "next/router";
import { useContext, useEffect, useRef, useState } from "react";
import Alias from "../../components/Alias";
import Spinner from "../../components/Spinner";
import renderError, { renderWarning } from "../../components/formUtils";
import Meta from "../../components/meta";
import TopUp from "../../components/topUpForm";
import { TZKT_API_URL, PREFERED_NETWORK } from "../../context/config";
import { AppDispatchContext, AppStateContext } from "../../context/state";
import { makeWertWidget } from "../../context/wert";
import { mutezToTez } from "../../utils/tez";
import { signers } from "../../versioned/apis";

const TopUpPage = () => {
  const state = useContext(AppStateContext)!;
  const disptach = useContext(AppDispatchContext)!;
  const router = useRouter();
  const [error, setError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const onSuccess = async (txId: string) => {
    if (!state.currentContract) return;

    let amount = 0;
    let transaction;
    try {
      transaction = await fetch(`${TZKT_API_URL}/v1/operations/${txId}`).then(
        res => res.json()
      );

      if (!transaction || transaction.length === 0) {
        return setTimeout(() => {
          onSuccess(txId);
        }, 5000);
      }

      amount = mutezToTez(transaction[0].amount as number);
    } catch (e) {
      setError("Failed to create the transaction");
    }

    try {
      const sent = await state.connection.wallet
        .transfer({ to: state.currentContract, amount })
        .send();

      setIsLoading(true);

      await sent.confirmation();

      const newContract = state.contracts[state.currentContract];
      newContract.balance = new BigNumber(newContract.balance)
        .plus(transaction[0].amount as number)
        .toString();
      disptach({
        type: "updateContract",
        payload: { contract: newContract, address: state.currentContract },
      });
      setIsLoading(false);
      setIsSuccess(true);
    } catch (e) {
      setError("Failed to execute the transfer");
    }
  };

  const wertWidgetRef = useRef(
    makeWertWidget({
      wallet: state.address ?? "",
      onSuccess,
    })
  );

  useEffect(() => {
    if (!state.currentContract || !state.address) return;

    wertWidgetRef.current = makeWertWidget({
      wallet: state.address ?? "",
      onSuccess,
    });
  }, [state.currentContract]);

  useEffect(() => {
    if (
      !router.query.walletAddress ||
      Array.isArray(router.query.walletAddress) ||
      !!state.address ||
      !state.attemptedInitialLogin
    )
      return;

    if (state.currentContract !== router.query.walletAddress) {
      disptach({
        type: "setCurrentContract",
        payload: router.query.walletAddress,
      });
    }

    router.replace(`/${router.query.walletAddress}/proposals`);
  }, [router.query.walletAddress, state.address, state.attemptedInitialLogin]);

  return (
    <div className="min-h-content relative flex grow flex-col">
      <Meta title={"Fund wallet - TzSafe"} />
      <div>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-extrabold text-white">
            Fund{" "}
            {state.aliases[state.currentContract ?? ""] ?? (
              <Alias address={state.currentContract ?? ""} disabled />
            )}
          </h1>
          <div>
            {!signers(
              state.contracts[state.currentContract ?? ""] ??
                state.currentStorage
            ).includes(state.address ?? "") &&
              renderWarning("You're not the owner of this wallet")}
          </div>
        </div>
      </div>
      <main className="min-h-fit grow">
        <div className="mx-auto min-h-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {PREFERED_NETWORK !== NetworkType.MAINNET && (
            <div>
              <h2 className="text-xl text-white">Buy Tez</h2>
              <p className="mt-2 font-light text-zinc-200">
                Our provider {"doesn't"} support transferring to Tezos contract
                yet. Therefore, after the transaction succeeds, we will
                automatically create a transaction from your wallet to your
                TzSafe wallet
              </p>
              <div className="flex w-full justify-center">
                <button
                  className="mt-4 rounded bg-primary px-4 py-2 font-medium text-white hover:bg-red-500 hover:outline-none focus:bg-red-500"
                  onClick={() => {
                    wertWidgetRef.current.mount();
                    setError(undefined);
                    setIsLoading(false);
                    setIsSuccess(false);
                  }}
                >
                  Buy
                </button>
              </div>
              <p className="mt-2">
                {!!error ? (
                  renderError(
                    `${error}. All the funds are safe on your wallet, you can transfer them manually to TzSafe`,
                    true
                  )
                ) : isLoading ? (
                  <Spinner />
                ) : isSuccess ? (
                  <span className="font-light text-white">
                    Transferred the funds from{" "}
                    <Alias address={state.address ?? ""} disabled /> to{" "}
                    <Alias disabled address={state.currentContract ?? ""} />{" "}
                  </span>
                ) : null}
              </p>
            </div>
          )}
          {!state.currentContract ? (
            <h2 className="text-center text-xl text-zinc-600">
              Please select a wallet in the sidebar
            </h2>
          ) : (
            <>
              <h2 className="mt-12 text-xl text-white">
                Send from <Alias address={state.address ?? ""} disabled />
              </h2>
              <TopUp
                address={state.currentContract ?? ""}
                closeModal={() => {}}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default TopUpPage;
