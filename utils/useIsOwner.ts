import { useContext, useMemo } from "react";
import { AppStateContext } from "../context/state";

const useIsOwner = () => {
  let state = useContext(AppStateContext)!;

  const isOwner = useMemo(
    () =>
      state.contracts[state.currentContract ?? ""]?.owners?.includes(
        state.address!
      ) ?? false,
    [state.currentContract, state.address, state.contracts]
  );

  return isOwner;
};

export default useIsOwner;
