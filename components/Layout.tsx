import { LocalStorage, NetworkType } from "@airgap/beacon-sdk";
import { ArrowRightIcon } from "@radix-ui/react-icons";
import { validateAddress, ValidationResult } from "@taquito/utils";
import { AppProps } from "next/app";
import { usePathname } from "next/navigation";
import router, { useRouter } from "next/router";
import { useEffect, useState } from "react";
import P2PClient from "../context/P2PClient";
import { PREFERED_NETWORK } from "../context/config";
import { init, useAppDispatch, useAppState } from "../context/state";
import { useTezosToolkit } from "../context/tezos-toolkit";
import { useWallet } from "../context/wallet";
import { contractStorage } from "../types/Proposal0_3_1";
import { fetchContract } from "../utils/fetchContract";
import Banner from "./Banner";
import LoginModal from "./LoginModal";
import PoeModal from "./PoeModal";
import Sidebar from "./Sidebar";
import Spinner from "./Spinner";
import Footer from "./footer";
import NavBar from "./navbar";

export default function Layout({
  Component,
  pageProps,
}: Pick<AppProps, "Component" | "pageProps">) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { tezos } = useTezosToolkit();
  const {
    state: { wallet },
  } = useWallet();

  const [data, setData] = useState<undefined | string>();
  const [hasSidebar, setHasSidebar] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const router = useRouter();
  const path = usePathname();
  const isSidebarHidden =
    Object.values(state.contracts).length === 0 &&
    (path === "/" ||
      path === "/new-wallet" ||
      path === "/import-wallet" ||
      path === "/address-book");

  useEffect(() => {
    if (!path) return;

    const queryParams = new URLSearchParams(window.location.search);

    const isPairing = queryParams.has("type") && queryParams.has("data");

    if (isPairing) {
      setData(queryParams.get("data")!);
    }

    const contracts = Object.keys(state.contracts);

    if ((path === "/" || path === "") && contracts.length > 0) {
      const contract = contracts[0];

      router.replace(`/${contract}/dashboard`);
      return;
    } else if (path === "/" || path === "") {
      // Get rid of query in case it comes from beacon
      router.replace("/");
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentContract, path, state.contracts]);

  useEffect(() => {
    (async () => {
      if (
        router.pathname.includes("[walletAddress]") &&
        !router.query.walletAddress
      )
        return;

      if (
        !router.query.walletAddress ||
        Array.isArray(router.query.walletAddress) ||
        (router.query.walletAddress === state.currentContract &&
          !!state.currentStorage)
      ) {
        setIsFetching(false);
        return;
      }

      if (!!state.contracts[router.query.walletAddress]) {
        dispatch({
          type: "setCurrentContract",
          payload: router.query.walletAddress,
        });
        setIsFetching(false);
        return;
      }

      if (
        validateAddress(router.query.walletAddress) !== ValidationResult.VALID
      ) {
        setIsFetching(false);
        router.replace(
          `/invalid-contract?address=${router.query.walletAddress}`
        );
        return;
      }

      if (state.currentStorage?.address === router.query.walletAddress) {
        setIsFetching(false);
        return;
      }

      try {
        const storage = await fetchContract(tezos, router.query.walletAddress);

        if (!storage) {
          setIsFetching(false);
          router.replace(
            `/invalid-contract?address=${router.query.walletAddress}`
          );
          return;
        }

        storage.address = router.query.walletAddress;

        dispatch({
          type: "setCurrentStorage",
          payload: storage as contractStorage & { address: string },
        });

        dispatch({
          type: "setCurrentContract",
          payload: router.query.walletAddress,
        });

        setIsFetching(false);
      } catch (e) {
        setIsFetching(false);

        router.replace(
          `/invalid-contract?address=${router.query.walletAddress}`
        );
      }
    })();
  }, [
    router.query.walletAddress,
    state.currentContract,
    dispatch,
    router,
    state.currentStorage,
    tezos,
    state.contracts,
  ]);
  useEffect(() => {
    (async () => {
      if (wallet === null) {
        let a = init();
        dispatch({ type: "init", payload: a });

        const p2pClient = new P2PClient({
          name: "TzSafe",
          storage: new LocalStorage("P2P"),
        });

        await p2pClient.init();
        await p2pClient.connect(p2pClient.handleMessages);

        // Connect stored peers
        Object.entries(a.connectedDapps).forEach(async ([address, dapps]) => {
          Object.values(dapps).forEach(data => {
            p2pClient
              .addPeer(data)
              .catch(_ => console.log("Failed to connect to peer", data));
          });
        });

        dispatch!({ type: "p2pConnect", payload: p2pClient });
      }
    })();
  }, [wallet]);

  useEffect(() => {
    setHasSidebar(false);
  }, [path]);

  return (
    <div className="relative min-h-screen">
      <div id="modal" />
      {!!data && (
        <LoginModal
          data={data}
          onEnd={() => {
            setData(undefined);
          }}
        />
      )}
      <PoeModal />
      <Banner>
        <span className="font-light">Make sure the URL is </span>
        {PREFERED_NETWORK === NetworkType.MAINNET
          ? "tzsafe.marigold.dev"
          : PREFERED_NETWORK === NetworkType.GHOSTNET
          ? "ghostnet.tzsafe.marigold.dev"
          : "a valid URL"}
      </Banner>
      <NavBar />

      {isSidebarHidden ? null : (
        <Sidebar
          isOpen={hasSidebar}
          onClose={() => setHasSidebar(false)}
          isLoading={isFetching}
        />
      )}

      <div
        className={`pb-28 pt-20 ${isSidebarHidden ? "" : "md:pl-72"} ${
          state.hasBanner ? "mt-12" : ""
        }`}
      >
        <button
          className="ml-4 mt-4 flex items-center space-x-2 text-zinc-300 md:hidden"
          onClick={() => {
            setHasSidebar(true);
          }}
        >
          <span className="text-xs">Open sidebar</span>
          <ArrowRightIcon className="h-4 w-4" />
        </button>

        {isFetching ? (
          <div className="mt-12 flex w-full items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <Component {...pageProps} />
        )}
      </div>
      <Footer shouldRemovePadding={isSidebarHidden} />
    </div>
  );
}
