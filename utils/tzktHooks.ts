import { useEffect, useState } from "react";
import { TZKT_API_URL } from "../context/config";

/**
 * Returns the balance of the given address
 * @param address tz/kt Tezos address
 */
export const useTzktBalance = (address: string | null) => {
  const [balance, setBalance] = useState(0);
  useEffect(() => {
    if (!address) return;
    (async () => {
      const response = await fetch(
        `${TZKT_API_URL}/v1/accounts/${address}/balance`
      );

      if (response.status === 200) {
        const json: number = await response.json();
        setBalance(json / 1_000_000); // Divided by the XTZ decimal
      }
    })();
  }, [address]);

  return balance;
};
