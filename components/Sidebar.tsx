import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@radix-ui/react-icons";
import * as Select from "@radix-ui/react-select";
import { tzip16 } from "@taquito/tzip16";
import BigNumber from "bignumber.js";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useContext, useEffect, useMemo, useState } from "react";
import fetchVersion from "../context/metadata";
import { AppDispatchContext, AppStateContext } from "../context/state";
import { version } from "../types/display";
import { signers, toStorage } from "../versioned/apis";
import Copy from "./Copy";
import Spinner from "./Spinner";

type selectItemProps = {
  name: string | undefined;
  address: string | undefined;
  balance: string | undefined;
  threshold: string;
  version: string | undefined;
  disableCopy?: boolean;
};

const linkClass = (isActive: boolean) =>
  `${isActive ? "text-zinc-100" : "text-zinc-400"} hover:text-zinc-100`;

const SelectedItem = ({
  name,
  address,
  balance,
  version,
  threshold,
  disableCopy = false,
}: selectItemProps) => {
  const formattedBalance = useMemo(() => {
    return new BigNumber(balance ?? 0).div(10 ** 6, 10).precision(5);
  }, [balance]);

  return (
    <div className="w-4/5 overflow-hidden text-left">
      <div className="flex items-center justify-between">
        <p className="text-xl text-white">{name}</p>
        <p>{threshold}</p>
      </div>
      <Copy value={address ?? ""} disabled={disableCopy}>
        <span className="mt-1 text-sm text-zinc-400" data-name="copy">
          {!address ? (
            <Spinner />
          ) : (
            `${address.substring(0, 5)}...${address.substring(
              address.length - 5
            )}`
          )}
        </span>
      </Copy>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-lg">{formattedBalance.toString()}xtz</p>
        <p className="text-xs text-zinc-500">V{version ?? "0.0.0"}</p>
      </div>
    </div>
  );
};

const FixedTrigger = (props: any) => {
  const { children, onClick, onPointerDown, ...rest } = props;

  return (
    <button
      {...rest}
      className="radix-state-delayed-open:bg-zinc-50 radix-state-instant-open:bg-zinc-50 radix-state-on:bg-zinc-900 radix-state-open:bg-zinc-900 group inline-flex w-full select-none items-center justify-between rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-900 focus:outline-none focus-visible:ring focus-visible:ring-red-500 focus-visible:ring-opacity-75"
      onClick={e => {
        if ((e.target as HTMLLinkElement).dataset.name === "copy") return;

        onClick(e);
      }}
      onPointerDown={e => {
        if ((e.target as HTMLLinkElement).dataset.name === "copy") return;

        onPointerDown(e);
      }}
    >
      {children}
    </button>
  );
};

const Sidebar = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const path = usePathname();

  const [isClient, setIsClient] = useState(false);

  let state = useContext(AppStateContext)!;
  let dispatch = useContext(AppDispatchContext)!;

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const entries = Object.entries(state.contracts);

    if (entries.length === 0 || !!state.currentContract) return;

    dispatch({
      type: "setCurrentContract",
      payload: entries[0][0],
    });
  }, [state.contracts]);

  useEffect(() => {
    if (!state.currentContract) return;

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
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentContract]);

  if (!isClient) return null;

  const currentContract = state.currentContract ?? "";

  return (
    <aside
      className={`fixed left-0 bottom-0 top-20 z-10 w-72 bg-zinc-700 px-4 py-4 md:py-8 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      } md:-translate-x-0`}
    >
      <button
        className="mb-8 flex w-full items-center justify-end space-x-2 text-zinc-500 md:hidden"
        onClick={onClose}
      >
        <span className="text-xs">Close sidebar</span>
        <ArrowLeftIcon className="h-4 w-4" />
      </button>
      <Select.Root
        onValueChange={payload => {
          dispatch({
            type: "setCurrentContract",
            payload,
          });
        }}
        value={currentContract}
      >
        <Select.Trigger asChild aria-label="Wallets">
          <FixedTrigger>
            <SelectedItem
              name={state.aliases[currentContract]}
              address={currentContract}
              balance={state.contracts[currentContract]?.balance}
              threshold={
                !!state.contracts[currentContract]
                  ? `${state.contracts[currentContract].threshold}/${
                      signers(state.contracts[currentContract]).length
                    }`
                  : "0/0"
              }
              version={state.contracts[currentContract]?.version}
            />
            <Select.Icon className="ml-2">
              <ChevronDownIcon />
            </Select.Icon>
          </FixedTrigger>
        </Select.Trigger>
        <Select.Content>
          <Select.ScrollUpButton className="flex items-center justify-center text-zinc-300">
            <ChevronUpIcon />
          </Select.ScrollUpButton>
          <Select.Viewport className="w-full rounded-lg bg-zinc-800 p-2 shadow-lg">
            <Select.Group>
              {Object.entries(state.contracts).map(
                ([address, _contract], i) => (
                  <Select.Item
                    key={`${address}-${i}`}
                    value={address}
                    className="radix-disabled:opacity-50 relative flex select-none items-center rounded-md px-8 py-2 text-sm font-medium text-zinc-300 focus:bg-zinc-800 focus:bg-zinc-900 focus:outline-none"
                  >
                    <Select.ItemText>
                      <p className="text-xl text-white">
                        {state.aliases[address]}
                      </p>

                      <p className="mt-1 text-sm text-zinc-400">
                        {address.substring(0, 5)}...
                        {address.substring(address.length - 5)}
                      </p>
                    </Select.ItemText>
                    <Select.ItemIndicator className="absolute left-2 inline-flex items-center">
                      <CheckIcon />
                    </Select.ItemIndicator>
                  </Select.Item>
                )
              )}
            </Select.Group>
          </Select.Viewport>
          <Select.ScrollDownButton className="flex items-center justify-center text-zinc-300">
            <ChevronDownIcon />
          </Select.ScrollDownButton>
        </Select.Content>
      </Select.Root>

      <div className="mt-8 flex flex-col space-y-4">
        <Link
          href="/proposals"
          className={linkClass(path === "/proposals")}
          onClick={onClose}
        >
          Proposals
        </Link>
        <Link
          href="/create-proposal"
          className={linkClass(path === "/create-proposal")}
          onClick={onClose}
        >
          Create a proposal
        </Link>
        <Link
          href="/top-up"
          className={linkClass(path === "/top-up")}
          onClick={onClose}
        >
          Top up wallet
        </Link>
        <Link
          href="/settings"
          className={linkClass(path === "/settings")}
          onClick={onClose}
        >
          Settings
        </Link>
        <Link
          href="/history"
          className={linkClass(path === "/history")}
          onClick={onClose}
        >
          History
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
