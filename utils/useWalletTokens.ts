import { useEffect, useState } from "react";
import { fa1_2Token } from "../components/FA1_2";
import { fa2Token } from "../components/FA2Transfer";
import { TZKT_API_URL } from "../context/config";
import useCurrentContract from "../hooks/useCurrentContract";

export type walletToken = fa1_2Token | fa2Token;

const useWalletTokens = () => {
  const currentContract = useCurrentContract();
  const [tokens, setTokens] = useState<undefined | walletToken[]>();

  useEffect(() => {
    fetch(`${TZKT_API_URL}/v1/tokens/balances?account=${currentContract}`)
      .then(res => res.json())
      .then(setTokens)
      .catch(err => console.error(`Cannot fetch tokens balances : ${err}`));
  }, [currentContract]);

  return tokens;
};

export default useWalletTokens;
