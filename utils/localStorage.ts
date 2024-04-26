import { Aliases, ConnectedDapps, Contracts } from "../types/app";

type AppStorage = {
  contracts: Contracts;
  aliases: Aliases;
  currentContract: string | null;
  connectedDapps: ConnectedDapps | undefined; //FIXME Shouldn't be undefined
};

const emptyStorage: AppStorage = {
  contracts: {},
  connectedDapps: {},
  currentContract: null,
  aliases: {},
};

const save =
  (userAddress: string) =>
  (
    key: "contracts" | "aliases" | "currentContract" | "connectedDapps",
    data: Contracts | Aliases | string | ConnectedDapps
  ) => {
    const storage = loadStorage(userAddress);
    localStorage.setItem(
      `new_app_state:${userAddress}`, //FIXME Temporarily to avoid collision between old and new state management
      JSON.stringify({ ...storage, [key]: data })
    );
  };

export const saveContractsToStorage = (
  userAddress: string,
  contracts: Contracts
) => save(userAddress)("contracts", contracts);

export const saveAliasesToStorage = (userAddress: string, aliases: Aliases) =>
  save(userAddress)("aliases", aliases);

export const saveCurrentContractToStorage = (
  userAddress: string,
  currentContract: string
) => save(userAddress)("currentContract", currentContract);

export const saveConnectedDappsToStorage = (
  userAddress: string,
  connectedDapps: ConnectedDapps
) => save(userAddress)("connectedDapps", connectedDapps);

export const loadStorage = (userAddress: string): AppStorage => {
  const rawStorage = localStorage.getItem(`new_app_state:${userAddress}`);
  if (!rawStorage) return emptyStorage;
  return JSON.parse(rawStorage);
};

export const loadDapps = (userAddress: string) =>
  loadStorage(userAddress).connectedDapps;

export const loadContracts = (userAddress: string) =>
  loadStorage(userAddress).contracts;
