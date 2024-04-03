import { mutezToTez } from "../../utils/tez";
import Alias from "../Alias";

type HistoryTransferProps = {
  proposal: Array<unknown>;
};

const HistoryTransfer = ({ proposal }: HistoryTransferProps) => {
  return (
    <div
      key={(proposal[1] as any).timestamp}
      className="grid h-16 w-full grid-cols-3 items-center gap-8 rounded border-b border-zinc-900 bg-zinc-800 px-6 py-4 text-white lg:grid-cols-4"
    >
      <span className="justify-self-start font-bold md:ml-11">
        <span className="hidden md:block">Received Tez</span>
        <span className="md:hidden">Received</span>
      </span>
      <span className="text-center font-light text-zinc-300 md:min-w-[7rem] md:text-left">
        <span className="hidden md:inline">From:</span>{" "}
        <Alias address={(proposal[1] as any).sender.address} />
      </span>
      <span className="truncate font-light text-zinc-300 md:min-w-[7rem]">
        <span className="hidden md:inline">Amount:</span>{" "}
        {mutezToTez((proposal[1] as any).amount)} Tez
      </span>
      <span className="hidden justify-self-end lg:block">
        {new Date((proposal[1] as any).timestamp).toLocaleDateString()} -{" "}
        {`${new Date((proposal[1] as any).timestamp)
          .getHours()
          .toString()
          .padStart(2, "0")}:${new Date((proposal[1] as any).timestamp)
          .getMinutes()
          .toString()
          .padStart(2, "0")}`}
      </span>
    </div>
  );
};

export default HistoryTransfer;
