import { useContext, useMemo } from "react";
import { AppStateContext } from "../context/state";
import Copy from "./Copy";

const Alias = ({
  address,
  className,
  length = 5,
}: {
  address: string;
  className?: string;
  length?: number;
}) => {
  const state = useContext(AppStateContext)!;

  const formatted = useMemo(
    () =>
      `${address.substring(0, length)}...${address.substring(
        address.length - length
      )}`,
    [address, length]
  );

  const toDisplay = useMemo(
    () =>
      state.aliases[address] === ""
        ? formatted
        : state.aliases[address] ?? formatted,
    [state, address, formatted]
  );

  return (
    <Copy value={address} text="Copy address">
      <span className={className}>{toDisplay}</span>
    </Copy>
  );
};

export default Alias;
