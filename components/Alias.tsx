import { useContext, useMemo } from "react";
import { AppStateContext } from "../context/state";
import { useTzktAccountAlias } from "../utils/getTzktAlias";
import Copy from "./Copy";

const Alias = ({
  address,
  className,
  disabled = false,
  length = 5,
}: {
  address: string;
  className?: string;
  length?: number;
  disabled?: boolean;
}) => {
  const state = useContext(AppStateContext)!;
  const tzktAlias = useTzktAccountAlias(address);
  console.log("🚀 ~ tzktAlias:", tzktAlias);
  const formatted = useMemo(
    () =>
      `${(address ?? "").substring(0, length)}...${(address ?? "").substring(
        (address ?? "").length - length
      )}`,
    [address, length]
  );

  const toDisplay = useMemo(
    () =>
      state.aliases[address] === ""
        ? tzktAlias ?? formatted
        : state.aliases[address],
    [state.aliases, address, formatted, tzktAlias]
  );

  console;
  return (
    <Copy value={address} text="Copy address" disabled={disabled}>
      <span className={className} title={address}>
        {toDisplay}
      </span>
    </Copy>
  );
};

export default Alias;
