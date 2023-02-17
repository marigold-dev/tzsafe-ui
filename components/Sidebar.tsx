import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@radix-ui/react-icons";
import * as Select from "@radix-ui/react-select";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useContext, useEffect, useState } from "react";
import { AppDispatchContext, AppStateContext } from "../context/state";
import Copy from "./Copy";

type selectItemProps = {
  name: string;
  address: string;
  balance: number;
  disableCopy?: boolean;
};

const linkClass = (isActive: boolean) =>
  `${isActive ? "text-zinc-100" : "text-zinc-400"} hover:text-zinc-100`;

const SelectedItem = ({
  name,
  address,
  balance,
  disableCopy = false,
}: selectItemProps) => (
  <div className="w-4/5 overflow-hidden text-left">
    <p className="text-xl text-white">{name}</p>
    <Copy value={address} disabled={disableCopy}>
      <span className="mt-1 text-sm text-zinc-400" data-name="copy">
        {address.substring(0, 5)}...{address.substring(address.length - 5)}
      </span>
    </Copy>
    <div className="mt-2 flex items-center justify-between">
      <p className="text-lg">{balance}tz</p>
      <p className="text-xs text-zinc-500">V0.0.0</p>
    </div>
  </div>
);

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

const Sidebar = () => {
  const path = usePathname();

  const [isClient, setIsClient] = useState(false);

  let state = useContext(AppStateContext)!;
  let dispatch = useContext(AppDispatchContext)!;

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const entries = Object.entries(state.contracts);

    if (entries.length === 0) return;

    dispatch({
      type: "setCurrentContract",
      payload: entries[0][0],
    });
  }, [state.contracts]);

  if (!isClient) return null;

  return (
    <aside className="h-screen w-72 bg-zinc-700 px-4 py-8">
      <Select.Root
        onValueChange={payload => {
          dispatch({
            type: "setCurrentContract",
            payload,
          });
        }}
        value={state.currentContract ?? ""}
      >
        <Select.Trigger asChild aria-label="Wallets">
          <FixedTrigger>
            <SelectedItem
              name={state.aliases[state.currentContract ?? ""]}
              address={state.currentContract ?? ""}
              balance={1000}
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
              {/* <SelectItem
                name="Jules 2"
                address="TZndqoinqfoifdoijqsdfijoez"
                balance={1000}
                disableCopy={true}
              />
              <SelectItem
                name="Jules 3"
                address="TZndqoinqfoifdoijqsdfijoez"
                balance={1000}
                disableCopy={true}
              /> */}
            </Select.Group>
          </Select.Viewport>
          <Select.ScrollDownButton className="flex items-center justify-center text-zinc-300">
            <ChevronDownIcon />
          </Select.ScrollDownButton>
        </Select.Content>
      </Select.Root>

      <div className="mt-8 flex flex-col space-y-4">
        <Link href="/proposals" className={linkClass(path === "/proposals")}>
          Proposals
        </Link>
        <Link href="/" className={linkClass(path === "")}>
          Create a proposal
        </Link>
        <Link href="/" className={linkClass(path === "")}>
          Top up wallet
        </Link>
        <Link href="/" className={linkClass(path === "")}>
          Settings
        </Link>
        <Link href="/history" className={linkClass(path === "/history")}>
          History
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
