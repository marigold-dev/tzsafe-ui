import router from "next/router";
import { useEffect, useState } from "react";
import { ParsedUrlQueryContract } from "../types/app";

const useCurrentContract = () => {
  const { walletAddress } = router.query as ParsedUrlQueryContract;
  const [currentContract, setCurrentContract] = useState<string>(
    walletAddress || ""
  );

  useEffect(() => {
    if (walletAddress) setCurrentContract(walletAddress);
  }, [walletAddress]);

  return currentContract;
};

export default useCurrentContract;
