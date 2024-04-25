import { getSenderId } from "@airgap/beacon-sdk";
import BigNumber from "bignumber.js";
import {
  Context,
  createContext,
  Dispatch,
  useContext,
  useEffect,
  useReducer,
} from "react";
import { ContractStorage, P2pData } from "../types/app";
import { Trie } from "../utils/radixTrie";
import P2PClient from "./P2PClient";
import { useWallet } from "./wallet";

type tezosState = {
  currentContract: string | null;
  currentStorage: ContractStorage | null;
  contracts: { [address: string]: ContractStorage };
  aliases: { [address: string]: string };
  aliasTrie: Trie<string>;
  hasBanner: boolean;
  delegatorAddresses: string[] | undefined;
  // Increasing this number will trigger a useEffect in the proposal page
  proposalRefresher: number;
};
type storage = {
  contracts: { [address: string]: ContractStorage };
  aliases: { [address: string]: string };
};

let emptyState = (): tezosState => {
  return {
    contracts: {},
    aliases: {},
    currentContract: null,
    currentStorage: null,
    aliasTrie: new Trie<string>(),
    hasBanner: true,
    delegatorAddresses: undefined,
    proposalRefresher: 0,
  };
};

type action =
  | { type: "init"; payload: tezosState }
  | {
      type: "addContract";
      payload: {
        aliases: { [address: string]: string };
        address: string;
        contract: ContractStorage;
      };
    }
  | {
      type: "updateContract";
      payload: { address: string; contract: ContractStorage };
    }
  | {
      type: "setCurrentStorage";
      payload: ContractStorage & { address: string };
    }
  | {
      type: "setCurrentContract";
      payload: string;
    }
  | { type: "removeContract"; address: string }
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
      type: "refreshProposals";
    }
  | {
      type: "setAttemptedInitialLogin";
      payload: boolean;
    }
  | {
      type: "logout";
    };

const saveState = (state: tezosState, userAddress: string) => {
  localStorage.setItem(
    `app_state:${userAddress}`,
    JSON.stringify({
      contracts: state.contracts,
      aliases: state.aliases,
      currentContract: state.currentContract,
    })
  );
};

const loadState = (userAddress: string) => {
  const rawStorage = localStorage.getItem(`app_state:${userAddress}`);
  if (!rawStorage) return {};
  return JSON.parse(rawStorage);
};

function reducer(
  state: tezosState,
  action: action,
  { userAddress }: { userAddress: string }
): tezosState {
  switch (action.type) {
    // case "p2pConnect": {
    //   return { ...state, p2pClient: action.payload };
    // }
    // case "addDapp": {
    //   state.connectedDapps[action.payload.address] ??= {};

    //   state.connectedDapps[action.payload.address][action.payload.data.appUrl] =
    //     action.payload.data;

    //   saveState(state, userAddress);

    //   return state;
    // }
    // case "removeDapp": {
    //   if (
    //     !state.currentContract ||
    //     !state.connectedDapps[state.currentContract][action.payload]
    //   )
    //     return state;

    //   const newState = { ...state };

    //   delete newState.connectedDapps[state.currentContract][action.payload];

    //   saveState(newState, userAddress);

    //   return newState;
    // }
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
      };

      saveState(newState, userAddress);

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

      saveState(newState, userAddress);

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

      if (state.contracts[action.payload.address])
        saveState(newState, userAddress);

      return newState;
    }
    case "setCurrentContract":
      const newState = {
        ...state,
        currentContract: action.payload,
      };

      saveState(newState, userAddress);

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
        {} as { [address: string]: ContractStorage }
      );
      return {
        ...action.payload,
        contracts,
        currentContract:
          state.currentContract ?? action.payload.currentContract,
        currentStorage: state.currentStorage,
        aliasTrie: Trie.fromAliases(Object.entries(action.payload.aliases)),
      };
    }

    case "removeContract": {
      const { [action.address]: _, ...contracts } = state.contracts;
      const { [action.address]: __, ...aliases } = state.aliases;
      // TODO WHEN SPLIT CONTRACTS INTO CONTEXT
      // const { [action.address]: contractDapps, ...connectedDapps } =
      //   state.connectedDapps;

      // Object.values(contractDapps ?? {}).forEach(async dapp => {
      //   const senderId = await getSenderId(dapp.publicKey);
      //   state.p2pClient?.removePeer(
      //     {
      //       ...dapp,
      //       type: "p2p-pairing-response",
      //       senderId,
      //     },
      //     true
      //   );
      // });

      const addresses = Object.keys(contracts);
      const currentContract = addresses.length > 0 ? addresses[0] : null;

      const newState = {
        ...state,
        contracts,
        currentContract,
        aliases,
        // connectedDapps,
      };

      saveState(newState, userAddress);

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
    case "loadStorage": {
      return { ...state, ...action.payload };
    }
    case "logout": {
      return { ...init() };
    }

    default: {
      throw `notImplemented: ${action.type}`;
    }
  }
}
function init(): tezosState {
  return emptyState();
}

const AppStateContext = createContext<{
  state: tezosState;
  dispatch: React.Dispatch<action>;
}>({ state: emptyState(), dispatch: () => {} });
const AppDispatchContext: Context<Dispatch<action> | null> =
  createContext<Dispatch<action> | null>(null);

const AppStateProvider = ({ children }: { children: React.ReactNode }) => {
  const { userAddress } = useWallet();

  useEffect(() => {
    // If we are in anonymous mode don't load the previous storage
    if (userAddress)
      dispatch({ type: "loadStorage", payload: loadState(userAddress) });
  }, [userAddress]);

  const [state, dispatch]: [tezosState, React.Dispatch<action>] = useReducer(
    (state: tezosState, action: action) =>
      reducer(state, action, { userAddress: userAddress || "" }),
    emptyState()
  );

  return (
    <AppStateContext.Provider value={{ state, dispatch }}>
      {children}
    </AppStateContext.Provider>
  );
};

const useAppState = () => useContext(AppStateContext).state;
const useAppDispatch = () => useContext(AppStateContext).dispatch;

export {
  type tezosState,
  type action,
  type ContractStorage,
  init,
  AppStateContext,
  AppDispatchContext,
  emptyState,
  reducer,
  AppStateProvider,
  useAppState,
  useAppDispatch,
};
