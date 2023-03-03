import { useContext, useMemo } from "react";
import { AppStateContext } from "../context/state";

const Alias = ({
  address,
  className,
}: {
  address: string;
  className?: string;
}) => {
  const state = useContext(AppStateContext)!;

  const toDisplay = useMemo(
    () =>
      state.aliases[address] ??
      `${address.substring(0, 5)}...${address.substring(
        address.length - 5,
        5
      )}`,
    [state]
  );

  return <span className={className}>{toDisplay}</span>;
};

export default Alias;
