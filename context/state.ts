import { AccountInfo } from "@airgap/beacon-sdk";
import { BeaconWallet } from "@taquito/beacon-wallet";
import { PollingSubscribeProvider, TezosToolkit } from "@taquito/taquito";
import {
  Handler,
  IpfsHttpHandler,
  MetadataProvider,
  TezosStorageHandler,
  Tzip16Module,
} from "@taquito/tzip16";
import { LocalStorage } from "beacon-wallet";
import { Context, createContext, Dispatch } from "react";
import { contractStorage } from "../types/app";
import { Trie } from "../utils/radixTrie";
import P2PClient from "./P2PClient";
import { IPFS_NODE, RPC_URL } from "./config";

type tezosState = {
  connection: TezosToolkit;
  beaconWallet: BeaconWallet | null;
  p2pClient: P2PClient;
  address: string | null;
  balance: string | null;
  currentContract: string | null;
  accountInfo: AccountInfo | null;
  contracts: { [address: string]: contractStorage };
  aliases: { [address: string]: string };
  favouriteContract: string | null;
  aliasTrie: Trie<string>;
  hasBanner: boolean;
  delegatorAddresses: string[] | undefined;
};
type storage = {
  contracts: { [address: string]: contractStorage };
  aliases: { [address: string]: string };
};

const p2pClient = new P2PClient({
  name: "TzSafe",
  storage: new LocalStorage("P2P"),
});

let emptyState = (): tezosState => {
  const connection = new TezosToolkit(RPC_URL);
  const customHandler = new Map<string, Handler>([
    ["ipfs", new IpfsHttpHandler(IPFS_NODE)],
    ["tezos-storage", new TezosStorageHandler()],
  ]);

  const customMetadataProvider = new MetadataProvider(customHandler);
  connection.addExtension(new Tzip16Module(customMetadataProvider));
  connection.setStreamProvider(
    connection.getFactory(PollingSubscribeProvider)({
      shouldObservableSubscriptionRetry: true,
      pollingIntervalMilliseconds: 500,
    })
  );

  return {
    beaconWallet: null,
    p2pClient,
    contracts: {},
    aliases: {},
    balance: null,
    address: null,
    currentContract: null,
    accountInfo: null,
    connection,
    favouriteContract: null,
    aliasTrie: new Trie<string>(),
    hasBanner: true,
    delegatorAddresses: undefined,
  };
};

type action =
  | { type: "beaconConnect"; payload: BeaconWallet }
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
      type: "setCurrentContract";
      payload: string;
    }
  | { type: "removeContract"; address: string }
  | { type: "setFavourite"; address: string }
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
    };

function reducer(state: tezosState, action: action): tezosState {
  switch (action.type) {
    case "beaconConnect": {
      state.connection.setWalletProvider(action.payload);
      return { ...state, beaconWallet: action.payload };
    }
    case "addContract": {
      let al = action.payload.aliases;
      let aliases = { ...state.aliases, ...al };
      let fav = !!state.favouriteContract
        ? state.favouriteContract
        : action.payload.address;
      let contracts = {
        ...state.contracts,
        [action.payload.address]: action.payload.contract,
      };
      localStorage.setItem(
        "app_state",
        JSON.stringify({ contracts, aliases, favouriteContract: fav })
      );
      return {
        ...state,
        contracts: contracts,
        aliases: aliases,
        currentContract: state.currentContract,
        aliasTrie: Trie.fromAliases(Object.entries(aliases)),
      };
    }
    case "updateAliases": {
      const newAliases = Object.fromEntries(
        action.payload.aliases.map(({ name, address }) => [address, name])
      );

      const aliases = {
        ...(action.payload.keepOld ? state.aliases : {}),
        ...newAliases,
      };

      localStorage.setItem(
        "app_state",
        JSON.stringify({
          contracts: state.contracts,
          aliases,
          currentContract: state.currentContract,
        })
      );
      return {
        ...state,
        aliases: aliases,
        aliasTrie: Trie.fromAliases(Object.entries(aliases)),
      };
    }
    case "updateContract": {
      let contracts = {
        ...state.contracts,
        [action.payload.address]: action.payload.contract,
      };
      if (state.contracts[action.payload.address]) {
        localStorage.setItem(
          "app_state",
          JSON.stringify({
            contracts,
            aliases: state.aliases,
            currentContract: state.currentContract,
          })
        );
      }
      return {
        ...state,
        contracts: contracts,
      };
    }
    case "setCurrentContract":
      localStorage.setItem(
        "app_state",
        JSON.stringify({
          contracts: state.contracts,
          aliases: state.aliases,
          currentContract: action.payload,
        })
      );

      return {
        ...state,
        currentContract: action.payload,
      };
    case "init": {
      return {
        ...action.payload,
        aliasTrie: Trie.fromAliases(Object.entries(action.payload.aliases)),
      };
    }
    case "login": {
      return {
        ...state,
        balance: action.balance,
        accountInfo: action.accountInfo,
        address: action.address,
      };
    }
    case "logout": {
      let { connection } = emptyState();

      return {
        ...state,
        beaconWallet: null,
        balance: null,
        accountInfo: null,
        address: null,
        connection: connection,
      };
    }
    case "removeContract": {
      const { [action.address]: _, ...contracts } = state.contracts;
      const { [action.address]: __, ...aliases } = { ...state.aliases };

      const fav =
        (state.favouriteContract || "") === action.address
          ? Object.keys(state.contracts).at(0) || null
          : state.favouriteContract;

      const addresses = Object.keys(contracts);

      localStorage.setItem(
        "app_state",
        JSON.stringify({
          contracts,
          aliases,
          currentContract: addresses.length > 0 ? addresses[0] : null,
        })
      );

      return {
        ...state,
        contracts,
        favouriteContract: fav,
        currentContract: addresses.length > 0 ? addresses[0] : null,
        aliases,
      };
    }
    case "setFavourite": {
      localStorage.setItem(
        "app_state",
        JSON.stringify({
          contracts: state.contracts,
          aliases: state.aliases,
          currentContract: state.currentContract,
        })
      );

      return {
        ...state,
        favouriteContract: action.address,
      };
    }
    case "setBanner":
      return {
        ...state,
        hasBanner: action.payload,
      };
    case "setDelegatorAddresses":
      return { ...state, delegatorAddresses: action.payload };
    default: {
      throw "notImplemented";
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
