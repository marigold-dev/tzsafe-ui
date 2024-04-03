import { useEffect, useState } from "react";
import { TZKT_API_URL } from "../context/config";

export const useTzktAccountAlias = (accountAddress: string) => {
  const [alias, setAlias] = useState<string | undefined>(undefined);

  useEffect(() => {
    (async () =>
      fetch(`${TZKT_API_URL}/v1/accounts/${accountAddress}`).then(
        async response => {
          if (response.status >= 200 && response.status < 300) {
            const json = await response.json();
            if (json["alias"]) {
              setAlias(json["alias"]);
            }
          }
        }
      ))();
  }, [accountAddress]);

  return alias;
};
