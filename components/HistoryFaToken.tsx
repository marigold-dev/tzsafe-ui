import { TriangleDownIcon } from "@radix-ui/react-icons";
import BigNumber from "bignumber.js";
import { useMemo, useState } from "react";
import { TransferType } from "../types/display";
import Alias from "./Alias";
import { fa1_2Token } from "./FA1_2";
import { fa2Token } from "./FA2Transfer";

type props = {
  transferType: TransferType;
  token: {
    timestamp: string;
    from: {
      address: string;
    };
    amount: string;
    token: fa1_2Token["token"] | fa2Token["token"];
  };
};

const HistoryFaToken = ({ transferType, token }: props) => {
  const [isOpen, setIsOpen] = useState(false);

  const { tzDate, tzHours, tzMinutes } = useMemo(
    () => ({
      tzDate: new Date(token.timestamp).toLocaleDateString(),
      tzHours: new Date(token.timestamp).getHours().toString().padStart(2, "0"),
      tzMinutes: new Date(token.timestamp)
        .getMinutes()
        .toString()
        .padStart(2, "0"),
    }),
    [token.timestamp]
  );

  return (
    <div
      key={token.timestamp}
      className={`${
        isOpen ? "h-full" : "h-16"
      } w-full overflow-hidden rounded bg-zinc-800 text-white`}
    >
      <button
        className="grid h-16 w-full grid-cols-4 items-center gap-8 border-b border-zinc-900 px-6 py-4 lg:grid-cols-5"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="justify-self-start font-bold md:ml-11">
          <span className="hidden md:block">
            Received {transferType === TransferType.FA2 ? "FA2" : "FA1.2"}
          </span>
          <span className="md:hidden">Received</span>
        </span>
        <span className="text-center font-light text-zinc-300 md:min-w-[7rem] md:text-left">
          <span className="hidden md:inline">From:</span>{" "}
          {!!token.from ? (
            <Alias address={token.from.address} />
          ) : (
            <span className="text-zinc-400">-</span>
          )}
        </span>
        <span className="truncate font-light text-zinc-300 md:min-w-[7rem]">
          <span className="hidden md:inline">Amount:</span>{" "}
          {BigNumber(token.amount)
            .div(BigNumber(10).pow(token.token.metadata?.decimals ?? 0))
            .toNumber()}{" "}
          {token.token.metadata?.symbol ?? ""}
        </span>
        <span className="hidden justify-self-end lg:block">
          {tzDate} - {`${tzHours}:${tzMinutes}`}
        </span>
        <div className="justify-self-end">
          <TriangleDownIcon
            className={`${isOpen ? "rotate-180" : ""} h-8 w-8`}
          />
        </div>
      </button>
      <div className="px-4 py-4 md:pl-16">
        <ul className="font-light">
          <li>
            <span className="text-zinc-400">Full name:</span>{" "}
            {token.token.metadata?.name ?? "No name"}
          </li>
          <li>
            <span className="text-zinc-400">Token ID:</span>{" "}
            {token.token.tokenId}
          </li>
          <li>
            <span className="text-zinc-400">Contract address:</span>{" "}
            <Alias address={token.token.contract.address} />
          </li>
        </ul>
      </div>
    </div>
  );
};

export default HistoryFaToken;
