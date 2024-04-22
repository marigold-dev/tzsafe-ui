import { useEffect, useState } from "react";
import { fa1_2Token } from "../components/FA1_2";
import { fa2Token } from "../components/FA2Transfer";
import { TZKT_API_URL } from "../context/config";
import { useAppState } from "../context/state";

export type walletToken = fa1_2Token | fa2Token;

const useWalletTokens = () => {
  const state = useAppState();
  const [tokens, setTokens] = useState<undefined | walletToken[]>();

  useEffect(() => {
    if (!state.currentContract) return;

    fetch(`${TZKT_API_URL}/v1/tokens/balances?account=${state.currentContract}`)
      .then(res => res.json())
      .then(setTokens);
  }, [state.currentContract]);

  return tokens;
};

export default useWalletTokens;
