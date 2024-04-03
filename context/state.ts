import { AccountInfo, getSenderId } from "@airgap/beacon-sdk";
import { BeaconWallet } from "@taquito/beacon-wallet";
import { PollingSubscribeProvider, TezosToolkit } from "@taquito/taquito";
import { Tzip12Module } from "@taquito/tzip12";
import {
  Handler,
  IpfsHttpHandler,
  MetadataProvider,
  TezosStorageHandler,
  Tzip16Module,
} from "@taquito/tzip16";
import BigNumber from "bignumber.js";
import { Context, createContext, Dispatch } from "react";
import { contractStorage } from "../types/app";
import { Trie } from "../utils/radixTrie";
import { p2pData } from "../versioned/interface";
import P2PClient from "./P2PClient";
import { IPFS_NODE, RPC_URL } from "./config";
import { BeaconSigner } from "./signer";

type tezosState = {
  connection: TezosToolkit;
  beaconWallet: BeaconWallet | null;
  p2pClient: P2PClient | null;
  address: string | null;
  balance: string | null;
  currentContract: string | null;
  currentStorage: contractStorage | null;
  accountInfo: AccountInfo | null;
  contracts: { [address: string]: contractStorage };
  aliases: { [address: string]: string };
  aliasesByUser: { [address: string]: { [addr: string]: string } };
  aliasTrie: Trie<string>;
  hasBanner: boolean;
  delegatorAddresses: string[] | undefined;
  connectedDapps: {
    [address: string]: {
      [id: string]: p2pData;
    };
  };
  // Increasing this number will trigger a useEffect in the proposal page
  proposalRefresher: number;
  attemptedInitialLogin: boolean;
  importedWallets: {
    [address: string]: { [contractAddr: string]: contractStorage };
  };
};
type storage = {
  contracts: { [address: string]: contractStorage };
  aliases: { [address: string]: string };
  aliasesByUser: { [address: string]: { [addr: string]: string } };
  importedWallets: {
    [address: string]: { [contractAddr: string]: contractStorage };
  };
};

let emptyState = (): tezosState => {
  const connection = new TezosToolkit(RPC_URL);

  const customHandler = new Map<string, Handler>([
    ["ipfs", new IpfsHttpHandler(IPFS_NODE)],
    ["tezos-storage", new TezosStorageHandler()],
  ]);

  const customMetadataProvider = new MetadataProvider(customHandler);
  connection.addExtension(new Tzip16Module(customMetadataProvider));
  connection.addExtension(new Tzip12Module());

  connection.setStreamProvider(
    connection.getFactory(PollingSubscribeProvider)({
      shouldObservableSubscriptionRetry: true,
      pollingIntervalMilliseconds: 500,
    })
  );

  return {
    beaconWallet: null,
    p2pClient: null,
    contracts: {},
    aliases: {},
    balance: null,
    address: null,
    currentContract: null,
    currentStorage: null,
    accountInfo: null,
    connection,
    aliasTrie: new Trie<string>(),
    hasBanner: true,
    delegatorAddresses: undefined,
    connectedDapps: {},
    proposalRefresher: 0,
    attemptedInitialLogin: false,
    importedWallets: {},
    aliasesByUser: {},
  };
};

type action =
  | { type: "beaconConnect"; payload: BeaconWallet }
  | { type: "p2pConnect"; payload: P2PClient }
  | { type: "init"; payload: tezosState }
  | {
      type: "login";
      accountInfo: AccountInfo;
      address: string;
      balance: string;
    }
  | {
      type: "addContract";
      payload: {
        aliases: { [address: string]: string };
        address: string;
        contract: contractStorage;
      };
    }
  | {
      type: "updateContract";
      payload: { address: string; contract: contractStorage };
    }
  | {
      type: "setCurrentStorage";
      payload: contractStorage & { address: string };
    }
  | {
      type: "setCurrentContract";
      payload: string;
    }
  | { type: "removeContract"; address: string }
  | { type: "logout" }
  | { type: "loadStorage"; payload: storage }
  | { type: "writeStorage"; payload: storage }
  | { type: "setDelegatorAddresses"; payload: string[] }
  | {
      type: "updateAliases";
      payload: {
        aliases: { address: string; name: string }[];
        keepOld: boolean;
      };
    }
  | {
      type: "setBanner";
      payload: boolean;
    }
  | {
      type: "addDapp";
      payload: {
        data: p2pData;
        address: string;
      };
    }
  | {
      type: "removeDapp";
      payload: string;
    }
  | {
      type: "refreshProposals";
    }
  | {
      type: "setAttemptedInitialLogin";
      payload: boolean;
    };

const saveState = (state: tezosState) => {
  const storage = JSON.parse(localStorage.getItem("app_state")!);
  localStorage.setItem(
    "app_state",
    JSON.stringify({
      contracts: state.contracts,
      aliases: state.aliases,
      currentContract: state.currentContract,
      connectedDapps: state.connectedDapps,
      importedWallets: storage
        ? { ...storage.importedWallets, ...state.importedWallets }
        : state.importedWallets,
      aliasesByUser: storage
        ? { ...storage.aliasesByUser, ...state.aliasesByUser }
        : state.aliasesByUser,
    })
  );
};

function reducer(state: tezosState, action: action): tezosState {
  switch (action.type) {
    case "beaconConnect": {
      state.connection.setProvider({
        rpc: RPC_URL,
        wallet: action.payload,
      });
      state.connection.setSignerProvider(new BeaconSigner(action.payload));
      return { ...state, beaconWallet: action.payload };
    }
    case "p2pConnect": {
      return { ...state, p2pClient: action.payload };
    }
    case "addDapp": {
      if (!state.address) return state;

      state.connectedDapps[action.payload.address] ??= {};

      state.connectedDapps[action.payload.address][action.payload.data.appUrl] =
        action.payload.data;

      saveState(state);

      return state;
    }
    case "removeDapp": {
      if (
        !state.currentContract ||
        !state.connectedDapps[state.currentContract][action.payload]
      )
        return state;

      const newState = { ...state };

      delete newState.connectedDapps[state.currentContract][action.payload];

      saveState(newState);

      return newState;
    }
    case "addContract": {
      let al = action.payload.aliases;
      let aliases = { ...state.aliases, ...al };

      let contracts = {
        ...state.contracts,
        [action.payload.address]: action.payload.contract,
      };

      const newState: tezosState = {
        ...state,
        contracts: contracts,
        aliases: aliases,
        currentContract: state.currentContract,
        aliasTrie: Trie.fromAliases(Object.entries(aliases)),
        importedWallets: {
          ...state.importedWallets,
          [state.address!]: {
            ...state.importedWallets[state.address!],
            [action.payload.address]: action.payload.contract,
          },
        },
        aliasesByUser: {
          ...state.aliasesByUser,
          [state.address!]: aliases,
        },
      };

      saveState(newState);

      return newState;
    }
    case "updateAliases": {
      const newAliases = Object.fromEntries(
        action.payload.aliases.map(({ name, address }) => [address, name])
      );

      const aliases = {
        ...(action.payload.keepOld ? state.aliases : {}),
        ...newAliases,
      };

      const newState = {
        ...state,
        aliases: aliases,
        aliasTrie: Trie.fromAliases(Object.entries(aliases)),
      };

      saveState(newState);

      return newState;
    }
    case "updateContract": {
      let contracts = {
        ...state.contracts,
        [action.payload.address]: action.payload.contract,
      };
      const newState = {
        ...state,
        contracts,
      };

      if (state.contracts[action.payload.address]) saveState(newState);

      return newState;
    }
    case "setCurrentContract":
      const newState = {
        ...state,
        currentContract: action.payload,
      };

      saveState(newState);

      return newState;
    case "setCurrentStorage":
      return {
        ...state,
        currentStorage: action.payload,
      };
    case "init": {
      const contracts = Object.entries(action.payload.contracts).reduce(
        (acc, [key, value]) => {
          acc[key] = {
            ...value,
            threshold: new BigNumber(value.threshold),
            proposal_counter: new BigNumber(value.proposal_counter),
            effective_period: new BigNumber(value.effective_period),
          };
          return acc;
        },
        {} as { [address: string]: contractStorage }
      );
      return {
        ...action.payload,
        contracts,
        attemptedInitialLogin: state.attemptedInitialLogin,
        currentContract:
          state.currentContract ?? action.payload.currentContract,
        currentStorage: state.currentStorage,
        aliasTrie: Trie.fromAliases(Object.entries(action.payload.aliases)),
      };
    }
    case "login": {
      const rawStorage = localStorage.getItem("app_state")!;
      const storage: storage = JSON.parse(rawStorage);
      const contracts =
        storage?.importedWallets && storage.importedWallets[action.address]
          ? Object.entries(storage.importedWallets[action.address]).reduce(
              (acc, [addr, contract]) => ({
                ...acc,
                [addr]: {
                  ...contract,
                  threshold: new BigNumber(contract.threshold),
                  proposal_counter: new BigNumber(contract.proposal_counter),
                  effective_period: new BigNumber(contract.effective_period),
                },
              }),
              {}
            )
          : {};
      const aliases =
        storage?.aliasesByUser && storage.aliasesByUser[action.address]
          ? storage.aliasesByUser[action.address]
          : state.aliases;

      const currentContract =
        state.currentContract || Object.keys(contracts).at(0) || null;
      return {
        ...state,
        balance: action.balance,
        accountInfo: action.accountInfo,
        address: action.address,
        attemptedInitialLogin: true,
        contracts,
        currentContract,
        aliases,
      };
    }
    case "logout": {
      let { connection } = emptyState();

      const newState: tezosState = {
        ...state,
        beaconWallet: null,
        balance: null,
        accountInfo: null,
        address: null,
        connection: connection,
        p2pClient: null,
        contracts: {},
        currentContract: null,
        aliases: {},
      };

      saveState(newState);

      return newState;
    }
    case "removeContract": {
      const { [action.address]: _, ...contracts } = state.contracts;
      const { [action.address]: __, ...aliases } = state.aliases;
      const { [action.address]: contractDapps, ...connectedDapps } =
        state.connectedDapps;

      Object.values(contractDapps ?? {}).forEach(async dapp => {
        const senderId = await getSenderId(dapp.publicKey);
        state.p2pClient?.removePeer(
          {
            ...dapp,
            type: "p2p-pairing-response",
            senderId,
          },
          true
        );
      });

      const addresses = Object.keys(contracts);
      const currentContract = addresses.length > 0 ? addresses[0] : null;

      const newState = {
        ...state,
        contracts,
        currentContract,
        aliases,
        connectedDapps,
      };

      saveState(newState);

      return newState;
    }
    case "setBanner":
      return {
        ...state,
        hasBanner: action.payload,
      };
    case "setDelegatorAddresses":
      return { ...state, delegatorAddresses: action.payload };
    case "refreshProposals":
      return { ...state, proposalRefresher: state.proposalRefresher + 1 };
    case "setAttemptedInitialLogin":
      return { ...state, attemptedInitialLogin: action.payload };
    default: {
      throw `notImplemented: ${action.type}`;
    }
  }
}
function init(): tezosState {
  let rawStorage = window!.localStorage.getItem("app_state")!;
  let storage: storage = JSON.parse(rawStorage);

  return {
    ...emptyState(),
    ...storage,
  };
}
let AppStateContext: Context<tezosState | null> =
  createContext<tezosState | null>(null);
let AppDispatchContext: Context<Dispatch<action> | null> =
  createContext<Dispatch<action> | null>(null);
export {
  type tezosState,
  type action,
  type contractStorage,
  init,
  AppStateContext,
  AppDispatchContext,
  emptyState,
  reducer,
};
