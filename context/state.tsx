import BigNumber from "bignumber.js";
import {
  Context,
  createContext,
  Dispatch,
  useContext,
  useEffect,
  useReducer,
} from "react";
import { ContractStorage } from "../types/app";
import { Trie } from "../utils/radixTrie";
import { useWallet } from "./wallet";

type tezosState = {
  currentContract: string | null;
  currentStorage: ContractStorage | null;
  contracts: { [address: string]: ContractStorage };
  aliases: { [address: string]: string };
  aliasTrie: Trie<string>;
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
    delegatorAddresses: undefined,
    proposalRefresher: 0,
  };
};

type action =
  | { type: "init"; payload: tezosState }
  | {
      type: "setCurrentStorage";
      payload: ContractStorage & { address: string };
    }
  | {
      type: "setCurrentContract";
      payload: string;
    }
  | { type: "loadStorage"; payload: storage }
  | { type: "writeStorage"; payload: storage }
  | { type: "setDelegatorAddresses"; payload: string[] }
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
