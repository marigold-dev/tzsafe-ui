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
import { Context, createContext, Dispatch } from "react";
import { contractStorage } from "../types/app";
import { Trie } from "../utils/radixTrie";
import { IPFS_NODE, RPC } from "./config";

type tezosState = {
  connection: TezosToolkit;
  beaconWallet: BeaconWallet | null;
  address: string | null;
  balance: string | null;
  currentContract: string | null;
  accountInfo: AccountInfo | null;
  contracts: { [address: string]: contractStorage };
  aliases: { [address: string]: string };
  favouriteContract: string | null;
  aliasTrie: Trie<string>;
};
type storage = {
  contracts: { [address: string]: contractStorage };
  aliases: { [address: string]: string };
};

let emptyState = () => {
  let connection = new TezosToolkit(RPC);
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
    contracts: {},
    aliases: {},
    balance: null,
    address: null,
    currentContract: null,
    accountInfo: null,
    connection,
    favouriteContract: null,
    aliasTrie: new Trie<string>(),
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
  | { type: "updateAliaces"; payload: { address: string; name: string }[] };

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
        favouriteContract: fav,
        aliasTrie: Trie.fromAliases(Object.entries(aliases)),
      };
    }
    case "updateAliaces": {
      let al = Object.fromEntries(
        action.payload.map(({ name, address }) => [address, name])
      );
      let aliases = { ...state.aliases, ...al };
      localStorage.setItem(
        "app_state",
        JSON.stringify({
          contracts: state.contracts,
          aliases,
          favouriteContract: state.favouriteContract,
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
            favouriteContract: state.favouriteContract,
          })
        );
      }
      return {
        ...state,
        contracts: contracts,
      };
    }
    case "setCurrentContract":
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
      const { [action.address]: __, ...newAliases } = { ...state.aliases };

      const fav =
        (state.favouriteContract || "") === action.address
          ? Object.keys(state.contracts).at(0) || null
          : state.favouriteContract;

      localStorage.setItem(
        "app_state",
        JSON.stringify({
          contracts,
          aliases: newAliases,
          favouriteContract: fav,
        })
      );

      const addresses = Object.keys(contracts);

      return {
        ...state,
        contracts,
        favouriteContract: fav,
        currentContract: addresses.length > 0 ? addresses[0] : null,
        aliases: newAliases,
      };
    }
    case "setFavourite": {
      localStorage.setItem(
        "app_state",
        JSON.stringify({
          contracts: state.contracts,
          aliases: state.aliases,
          favouriteContract: action.address,
        })
      );

      return {
        ...state,
        favouriteContract: action.address,
      };
    }
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
