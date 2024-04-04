import React, { useRef } from "react";
import { createContext } from "react";
import { TZKT_API_URL } from "./config";

type AliasesContextType = {
  getAlias(address: string, defaultAlias: string): Promise<string>;
}; // Map address with his alias. Alias can be from TZKT or Tzsafe or address by default

export const AliasesContext = createContext<AliasesContextType>({
  getAlias: (address: string, defaultAlias: string) => Promise.resolve(address),
});

export const AliasesProvider = ({
  children,
  aliasesFromState,
}: {
  children: React.ReactNode;
  aliasesFromState: { [address: string]: string };
}) => {
  const aliases = useRef<Record<string, Promise<string | undefined>>>({});

  const getTzktAlias = async (address: string) => {
    // address can be empty string...
    if (address === "") return undefined;

    const alias = aliases.current[address];
    if (!alias) {
      const aliasFromTzkt = fetch(
        `${TZKT_API_URL}/v1/accounts/${address}`
      ).then(async response => {
        if (response.status >= 200 && response.status < 300) {
          const json = await response.json();
          if (json["alias"]) {
            return json["alias"] as string;
          }
          return undefined;
        } else return undefined;
      });
      aliases.current[address] = aliasFromTzkt;
      return aliasFromTzkt;
    }
    return alias;
  };

  const getAlias = async (address: string, defaultAlias: string) => {
    const alias = await getTzktAlias(address);
    if (alias) return alias;
    if (aliasesFromState[address]) return aliasesFromState[address];
    return defaultAlias;
  };

  return (
    <AliasesContext.Provider
      value={{
        getAlias,
      }}
    >
      {children}
    </AliasesContext.Provider>
  );
};

export const useAliases = () => React.useContext(AliasesContext);
