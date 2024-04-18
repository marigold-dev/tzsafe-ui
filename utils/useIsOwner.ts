import { useMemo } from "react";
import { useAppState } from "../context/state";
import { useWallet } from "../context/wallet";
import { signers } from "../versioned/apis";

const useIsOwner = () => {
  let state = useAppState();
  const {
    state: { userAddress },
  } = useWallet();

  const isOwner = useMemo(
    () =>
      !!userAddress &&
      (state.contracts[state.currentContract ?? ""]?.owners?.includes(
        userAddress
      ) ??
        (!!state.currentStorage &&
          signers(state.currentStorage).includes(userAddress!))),
    [state.currentContract, userAddress, state.contracts, state.currentStorage]
  );

  return isOwner;
};

export default useIsOwner;
