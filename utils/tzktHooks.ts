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
      try {
        const response = await fetch(
          `${TZKT_API_URL}/v1/accounts/${address}/balance`
        );

        if (response.status === 200) {
          const json: number = await response.json();
          setBalance(json / 1_000_000); // Divided by the XTZ decimal
        }
      } catch (err) {
        console.error("Cannot fetch balance", err);
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
      try {
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
      } catch (err) {
        console.error("Cannot fetch DeFi tokens", err);
      }
    })();
  }, [address]);
  return defi;
};

export type Price = {
  value: number; // A float
  evolution: number; // evolution of XTZ price over 30 days
};

/**
 * Returns information about the price of the XTZ
 * - the current price
 * - the price evolution
 * */
export const useTzktPrice = (currency = "usd") => {
  const [price, setPrice] = useState<Price | null>(null);
  useEffect(() => {
    (async () => {
      try {
        // Let's compute the price evolution
        const pricesResponse = await fetch(
          `https://back.tzkt.io/v1/home?quote=${currency}`
        );
        if (pricesResponse.status !== 200) return;
        const pricesJson = await pricesResponse.json();
        const prices: Array<{ date: string; value: number }> =
          pricesJson.priceChart;
        // let's find the oldest and the most recent date
        prices.sort((price1, price2) => {
          const date1 = new Date(price1.date);
          const date2 = new Date(price2.date);
          return date1.getTime() - date2.getTime();
        });
        const first = prices[0];
        const last = prices[prices.length - 1];
        const evolution = last.value / first.value;

        // Let's get the current price
        const headResponse = await fetch("https://back.tzkt.io/v1/head");
        if (headResponse.status !== 200) return;
        const headJson = await headResponse.json();
        const value =
          currency === "usd" ? headJson.quoteUsd : headJson.quoteUsd; // by default we returned the usd price

        // update the hook state
        setPrice({ value, evolution });
      } catch (err) {
        console.error("Cannot fetch price", err);
      }
    })();
  }, [currency]);
  return price;
};
