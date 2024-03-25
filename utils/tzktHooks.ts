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

/**
 * Token type returned by:
 * https://api.tzkt.io/v1/tokens/balances
 * Only useful fields are typed
 */
type Tzkt_token = {
  contract: {
    address: string;
  };
  token: {
    contract: {
      address: string;
    };
    metadata?: {
      name?: string;
      symbol?: string;
      decimals?: string;
      thumbnailUri?: string; // this is not documented in the Tzkt API
    };
  };
  balance: string;
};

export type Defi = {
  contract: string;
  balance: number;
  symbol: string;
  icon: string;
};

/**
 * Returns Defi Tokens of the given address
 * @param address tz/kt Tezos address
 */
export const useTzktDefiTokens = (address: string | null) => {
  const [defi, setDefi] = useState<Defi[]>([]);

  useEffect(() => {
    if (address === null) return;
    (async () => {
      const response = await fetch(
        `${TZKT_API_URL}/v1/tokens/balances?account=${address}`
      );
      // Check if the response is a success
      if (response.status !== 200) {
        return;
      }
      const tokens: Array<Tzkt_token> = await response.json();
      // First removes what is not a DeFi token
      const defi = tokens
        .filter(token => {
          return (
            token.token.metadata &&
            token.token.metadata.decimals &&
            token.token.metadata.symbol // If this field is defined then it's a defi token
          );
        })
        .map(token => {
          const contract = token.token.contract.address;
          const decimals: number =
            10 ** Number.parseInt(token.token.metadata?.decimals || "0"); // Should be defined because of filter
          const balance = Number.parseInt(token.balance) / decimals; // the balance is now a float
          const symbol: string = token.token.metadata?.symbol as string; // Checked above to be non null
          const thumbnailUri = token.token.metadata?.thumbnailUri;
          let icon = "";
          if (thumbnailUri && thumbnailUri.startsWith("ipfs://")) {
            icon = thumbnailUri.replace("ipfs://", "https://ipfs.io/ipfs/");
          } else if (thumbnailUri && thumbnailUri.startsWith("https://")) {
            icon = thumbnailUri;
          } else if (!thumbnailUri) {
            icon = `https://services.tzkt.io/v1/avatars/${contract}`; // using Tzkt avatar API
          } else {
          }
          return { contract, balance, symbol, icon };
        })
        .filter(token => token.balance !== 0); // We don't care about tokens with 0 balance, I prefer to filter here because the balance is converted to number
      setDefi(defi);
    })();
  }, [address]);
  return defi;
};
