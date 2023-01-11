import { AccountInfo } from "@airgap/beacon-sdk";
import { BeaconWallet } from "@taquito/beacon-wallet";
import { PollingSubscribeProvider, TezosToolkit } from "@taquito/taquito";
import { Context, createContext, Dispatch } from "react";
import { RPC } from "./config";
import { Tzip16Module } from '@taquito/tzip16';

type contractStorage = {
  proposal_counter: string;
  balance: string;
  proposal_map: string;
  signers: string[];
  threshold: number;
  version: string;
};
type tezosState = {
  connection: TezosToolkit;
  beaconWallet: BeaconWallet | null;
  address: string | null;
  balance: string | null;
  accountInfo: AccountInfo | null;
  contracts: { [address: string]: contractStorage };
  aliases: { [address: string]: string };
};
type storage = {
  contracts: { [address: string]: contractStorage };
  aliases: { [address: string]: string };
};

let emptyState = ()  => {
  let connection = new TezosToolkit(RPC);
  connection.setStreamProvider(connection.getFactory(PollingSubscribeProvider)({
    shouldObservableSubscriptionRetry: true, 
    pollingIntervalMilliseconds: 1500,
  }));
  
  connection.addExtension(new Tzip16Module());

  connection.setProvider({config: {}})
  
  return {
    beaconWallet: null,
    contracts: {},
    aliases: {},
    balance: null,
    address: null,
    accountInfo: null,
    connection,
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
  | { type: "removeContract"; address: string }
  | { type: "logout" }
  | { type: "loadStorage"; payload: storage }
  | { type: "writeStorage"; payload: storage }
  | {type: "updateAliaces"; payload: {address: string, name: string}[]}

function reducer(state: tezosState, action: action): tezosState {
  switch (action.type) {
    case "beaconConnect": {
      state.connection.setWalletProvider(action.payload);
      return { ...state, beaconWallet: action.payload };
    }
    case "addContract": {
      let al = action.payload.aliases;
      let aliases = { ...state.aliases, ...al };
      let contracts = {
        ...state.contracts,
        [action.payload.address]: action.payload.contract,
      };
      localStorage.setItem("app_state", JSON.stringify({ contracts, aliases }));
      return {
        ...state,
        contracts: contracts,
        aliases: aliases,
      };
    }
    case "updateAliaces": {
      let al = Object.fromEntries(action.payload.map(({name, address}) => [address,name]));
      let aliases = {...state.aliases,...al };
      localStorage.setItem("app_state", JSON.stringify({contracts: state.contracts, aliases}))
      return {
        ...state, aliases: aliases
      }
    }
    case "updateContract": {
      let contracts = {
        ...state.contracts,
        [action.payload.address]: action.payload.contract,
      };
      if (state.contracts[action.payload.address]) {
        localStorage.setItem(
          "app_state",
          JSON.stringify({ contracts, aliases: state.aliases })
        );
      }
      return {
        ...state,
        contracts: contracts,
      };
    }
    case "init": {
      return {
        ...action.payload,
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
      return {
        ...state,
        beaconWallet: null,
        balance: null,
        accountInfo: null,
        address: null,
        connection: new TezosToolkit(RPC),
      };
    }
    case "removeContract": {
      let 
       {
        [action.address]: _,
        ...contracts      
      } = state.contracts;
      if (state.contracts[action.address]) {
        localStorage.setItem(
          "app_state",
          JSON.stringify({ contracts, aliases: state.aliases })
        );
      }
      return {
        ...state,
        contracts: contracts,
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
  init,
  AppStateContext,
  AppDispatchContext,
  emptyState,
  reducer,
};
