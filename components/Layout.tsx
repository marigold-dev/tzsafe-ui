import { ArrowRightIcon } from "@radix-ui/react-icons";
import { validateAddress, ValidationResult } from "@taquito/utils";
import { AppProps } from "next/app";
import { usePathname } from "next/navigation";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useContracts } from "../context/contracts";
import { useAppState } from "../context/state";
import { useTezosToolkit } from "../context/tezos-toolkit";
import useCurrentContract from "../hooks/useCurrentContract";
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
  const { tezos } = useTezosToolkit();

  const [data, setData] = useState<undefined | string>();
  const [hasSidebar, setHasSidebar] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const router = useRouter();
  const path = usePathname();
  const { contracts, fetchContract } = useContracts();
  const currentContract = useCurrentContract();
  const isSidebarHidden =
    Object.values(contracts).length === 0 &&
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

    const contractsAddress = Object.keys(contracts);

    if ((path === "/" || path === "") && contractsAddress.length > 0) {
      const contract = contractsAddress[0];

      router.replace(`/${contract}/dashboard`);
      return;
    } else if (path === "/" || path === "") {
      // Get rid of query in case it comes from beacon
      router.replace("/");
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentContract, path, contracts]);

  useEffect(() => {
    (async () => {
      if (validateAddress(currentContract) !== ValidationResult.VALID) {
        setIsFetching(false);
        router.replace(`/invalid-contract?address=${currentContract}`);
        return;
      }
      setIsFetching(true);
      fetchContract(currentContract)
        .then(() => setIsFetching(false))
        .catch(() => {
          setIsFetching(false);
          router.replace(`/invalid-contract?address=${currentContract}`);
        });
    })();
  }, [currentContract, state.currentStorage, tezos]);

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

      <NavBar />

      {isSidebarHidden ? null : (
        <Sidebar
          isOpen={hasSidebar}
          onClose={() => setHasSidebar(false)}
          isLoading={isFetching}
        />
      )}

      <div className={`pb-28 pt-20 ${isSidebarHidden ? "" : "md:pl-72"}`}>
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
