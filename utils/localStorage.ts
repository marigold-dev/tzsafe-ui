import { Aliases, ConnectedDapps, Contracts } from "../types/app";

type AppStorage = {
  contracts: Contracts;
  aliases: Aliases;
  currentContract: string | null;
  connectedDapps: ConnectedDapps;
};

const emptyStorage: AppStorage = {
  contracts: {},
  connectedDapps: {},
  currentContract: null,
  aliases: {},
};

const save =
  (userAddress: string) =>
  (data: Contracts | Aliases | string | ConnectedDapps) => {
    const storage = loadStorage(userAddress);
    localStorage.setItem(
      `app_state:${userAddress}`,
      JSON.stringify({ ...storage, data })
    );
  };

export const saveContractsToStorage = (
  userAddress: string,
  contracts: Contracts
) => save(userAddress)(contracts);

export const saveAliasesToStorage = (userAddress: string, aliases: Aliases) =>
  save(userAddress)(aliases);

export const saveCurrentContractToStorage = (
  userAddress: string,
  currentContract: string
) => save(userAddress)(currentContract);

export const saveConnectedDappsToStorage = (
  userAddress: string,
  connectedDapps: ConnectedDapps
) => save(userAddress)(connectedDapps);

export const loadStorage = (userAddress: string): AppStorage => {
  const rawStorage = localStorage.getItem(`app_state:${userAddress}`);
  if (!rawStorage) return emptyStorage;
  return JSON.parse(rawStorage);
};

export const loadDapps = (userAddress: string) =>
  loadStorage(userAddress).connectedDapps;
