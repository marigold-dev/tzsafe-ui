import { useContext, useMemo } from "react";
import { AppStateContext } from "../context/state";
import { signers } from "../versioned/apis";

const useIsOwner = () => {
  let state = useContext(AppStateContext)!;

  const isOwner = useMemo(
    () =>
      !!state.address &&
      (state.contracts[state.currentContract ?? ""]?.owners?.includes(
        state.address
      ) ??
        (!!state.currentStorage &&
          signers(state.currentStorage).includes(state.address!))),
    [
      state.currentContract,
      state.address,
      state.contracts,
      state.currentStorage,
    ]
  );

  return isOwner;
};

export default useIsOwner;
