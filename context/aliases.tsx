import React, { useEffect, useReducer, useRef } from "react";
import { createContext } from "react";
import { Aliases } from "../types/app";
import { loadAliases, saveAliasesToStorage } from "../utils/localStorage";
import { TZKT_API_URL } from "./config";
import { useWallet } from "./wallet";

type AliasesContextType = {
  addAlias(address: string, alias: string): void;
  removeAlias(address: string): void;
  updateAliases(aliases: Array<{ address: string; name: string }>): void;
  addressBook: Aliases; // Aliases defined in Tzsafe
  getAlias(address: string, defaultAlias: string): Promise<string>;
}; // Map address with his alias. Alias can be from TZKT or Tzsafe or address by default

type AliasesActions =
  | {
      type: "LOAD_ALIASES";
      aliases: Aliases;
    }
  | {
      type: "REMOVE_ALIAS";
      payload: { address: string };
    }
  | {
      type: "ADD_ALIAS";
      payload: { address: string; alias: string };
    }
  | {
      type: "UPDATE_ALIASES";
      aliases: Array<{ address: string; name: string }>;
    };

export const AliasesContext = createContext<AliasesContextType>({
  addressBook: {},
  getAlias: (address: string, defaultAlias: string) => Promise.resolve(address),
  removeAlias: () => {},
  addAlias: () => {},
  updateAliases: () => {},
});

const reducer = (state: Aliases, action: AliasesActions) => {
  switch (action.type) {
    case "ADD_ALIAS":
      return { ...state, [action.payload.address]: action.payload.alias };
    case "REMOVE_ALIAS":
      const { [action.payload.address]: deleted, ...others } = state;
      return { ...state, ...others };
    case "LOAD_ALIASES":
      return action.aliases;
    case "UPDATE_ALIASES":
      const newAliases = Object.fromEntries(
        action.aliases.map(({ name, address }) => [address, name])
      );
      return { ...state, ...newAliases };
    default:
      return state;
  }
};

export const AliasesProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { userAddress } = useWallet();
  const aliases = useRef<Record<string, Promise<string | undefined>>>({});

  const [state, dispatch] = useReducer(reducer, {});

  useEffect(() => {
    const loadedAliases = userAddress ? loadAliases(userAddress) : {};
    dispatch({ type: "LOAD_ALIASES", aliases: loadedAliases ?? {} });
  }, [userAddress]);

  // Save state to storage when state is updated
  useEffect(() => {
    if (Object.keys(state).length !== 0)
      saveAliasesToStorage(userAddress || "", state);
  }, [state, userAddress]);

  const getTzktAlias = async (address: string) => {
    // address can be empty string...
    if (address === "") return undefined;

    const alias = aliases.current[address];
    if (!alias) {
      const aliasFromTzkt = fetch(`${TZKT_API_URL}/v1/accounts/${address}`)
        .then(async response => {
          if (response.status >= 200 && response.status < 300) {
            if (response.status === 204) {
              // Meaning no content = no alias
              return undefined;
            }
            const json = await response.json();
            if (json["alias"]) {
              return json["alias"] as string;
            }
            return undefined;
          } else return undefined;
        })
        .catch(err => {
          console.error("Cannot fetch alias", err);
          return undefined;
        });
      aliases.current[address] = aliasFromTzkt;
      return aliasFromTzkt;
    }
    return alias;
  };

  const getAlias = async (address: string, defaultAlias: string) => {
    const alias = await getTzktAlias(address);
    if (alias) return alias;
    if (state[address]) return state[address];
    return defaultAlias;
  };

  return (
    <AliasesContext.Provider
      value={{
        getAlias,
        addressBook: state,
        addAlias: (address, alias) =>
          dispatch({ type: "ADD_ALIAS", payload: { address, alias } }),
        removeAlias: address =>
          dispatch({ type: "REMOVE_ALIAS", payload: { address } }),
        updateAliases: aliases => dispatch({ type: "UPDATE_ALIASES", aliases }),
      }}
    >
      {children}
    </AliasesContext.Provider>
  );
};

export const useAliases = () => React.useContext(AliasesContext);
