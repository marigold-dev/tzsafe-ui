import { createContext, useContext, useEffect, useReducer } from "react";
import { ContractStorage, Contracts } from "../types/app";
import { fetchContract } from "../utils/fetchContract";
import { loadContracts, saveContractsToStorage } from "../utils/localStorage";
import { useTezosToolkit } from "./tezos-toolkit";
import { useWallet } from "./wallet";

type ContractsContextType = {
  contracts: Contracts;
  addOrUpdateContract(addr: string, contract: ContractStorage): void;
  removeContract(addr: string): void;
  fetchContract(addr: string): Promise<ContractStorage>;
};

type ContractsActions =
  | {
      type: "ADD_OR_UPDATE_CONTRACT";
      payload: {
        contract: ContractStorage;
        contractAddress: string;
      };
    }
  | {
      type: "REMOVE_CONTRACT";
      payload: { contractAddress: string };
    }
  | { type: "LOAD_CONTRACTS"; payload: { contracts: Contracts } };

const ContractsContext = createContext<ContractsContextType>({
  contracts: {},
  addOrUpdateContract: () => {},
  removeContract: () => {},
  fetchContract: () => Promise.reject(),
});

const reducer = (state: Contracts, action: ContractsActions) => {
  switch (action.type) {
    case "ADD_OR_UPDATE_CONTRACT": {
      const p = action.payload;
      return { ...state, [p.contractAddress]: p.contract };
    }
    case "REMOVE_CONTRACT": {
      const p = action.payload;
      const { [p.contractAddress]: contract, ...otherContracts } = state;
      return { ...state, ...otherContracts };
    }
    case "LOAD_CONTRACTS":
      return action.payload.contracts;
    default:
      return state;
  }
};

export const ContractsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [state, dispatch] = useReducer(reducer, {});
  const { userAddress } = useWallet();
  const { tezos } = useTezosToolkit();

  const fetch = async (address: string) => {
    const contract = await fetchContract(tezos, address);
    if (contract) {
      dispatch({
        type: "ADD_OR_UPDATE_CONTRACT",
        payload: { contractAddress: address, contract },
      });
      return contract;
    }
    return Promise.reject("Unknown contract");
  };

  useEffect(() => {
    const contracts = userAddress ? loadContracts(userAddress) : {};
    dispatch({
      type: "LOAD_CONTRACTS",
      payload: { contracts: contracts ?? {} },
    });
  }, [userAddress]);

  // Save state to storage when state is updated
  useEffect(() => {
    if (Object.keys(state).length !== 0)
      saveContractsToStorage(userAddress || "", state);
  }, [state, userAddress]);

  return (
    <ContractsContext.Provider
      value={{
        contracts: state,
        addOrUpdateContract: (addr, contract) =>
          dispatch({
            type: "ADD_OR_UPDATE_CONTRACT",
            payload: { contract, contractAddress: addr },
          }),
        removeContract: addr =>
          dispatch({
            type: "REMOVE_CONTRACT",
            payload: { contractAddress: addr },
          }),
        fetchContract: addr => fetch(addr),
      }}
    >
      {children}
    </ContractsContext.Provider>
  );
};

export const useContracts = () => useContext(ContractsContext);
export const useContract = (address: string): ContractStorage | undefined => {
  const { contracts } = useContext(ContractsContext);
  return contracts[address];
};
