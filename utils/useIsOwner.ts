import { useMemo } from "react";
import { useContracts } from "../context/contracts";
import { useAppState } from "../context/state";
import { useWallet } from "../context/wallet";
import useCurrentContract from "../hooks/useCurrentContract";
import { signers } from "../versioned/apis";

const useIsOwner = () => {
  let state = useAppState();
  const { userAddress } = useWallet();
  const { contracts } = useContracts();
  const currentContract = useCurrentContract();

  const isOwner = useMemo(
    () =>
      !!userAddress &&
      (contracts[currentContract]?.owners?.includes(userAddress) ??
        (!!state.currentStorage &&
          signers(state.currentStorage).includes(userAddress!))),
    [currentContract, userAddress, contracts, state.currentStorage]
  );

  return isOwner;
};

export default useIsOwner;
