import React, { createContext, useContext, useReducer } from "react";
import { contractStorage } from "../types/app";

type ContractsContextType = {
  contracts: { [address: string]: contractStorage };
  currentContract: string | null;
  currentStorage: contractStorage | null; // TODO UTILE ??
  addContract(address: string, contract: contractStorage): void;
  removeContract(address: string): void;
  updateContract(address: string, contract: contractStorage): void;
};

const initialState: ContractsContextType = {
  contracts: {},
  currentContract: null,
  currentStorage: null,
  addContract: () => {},
  removeContract: () => {},
  updateContract: () => {},
};

const ContractsContext = createContext<ContractsContextType>(initialState);

type ContractsActions =
  | {
      type: "ADD_CONTRACT";
      payload: { address: string; contract: contractStorage };
    }
  | {
      type: "REMOVE_CONTRACT";
      payload: { address: string };
    }
  | {
      type: "UPDATE_CONTRACT";
      payload: { address: string; contract: contractStorage };
    };

const reducer = (state: ContractsContextType, action: ContractsActions) => {
  switch (action.type) {
    case "ADD_CONTRACT":
      // TODO save state to storage
      return {
        ...state,
        contracts: {
          ...state.contracts,
          [action.payload.address]: action.payload.contract,
        },
      };
    case "REMOVE_CONTRACT":
      const { [action.payload.address]: _, ...contracts } = state.contracts;
      // TODO save state to storage
      const addresses = Object.keys(contracts);
      const currentContract = addresses.length > 0 ? addresses[0] : null;

      return { ...state, contracts, currentContract };
    case "UPDATE_CONTRACT":
      // TODO save state to storage
      return {
        ...state,
        contracts: {
          ...state.contracts,
          [action.payload.address]: action.payload.contract,
        },
      };
    default:
      return state;
  }
};

export const ContractsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <ContractsContext.Provider
      value={{
        ...state,
        addContract: (address, contract) =>
          dispatch({ type: "ADD_CONTRACT", payload: { address, contract } }),
        removeContract: address =>
          dispatch({ type: "REMOVE_CONTRACT", payload: { address } }),
        updateContract: (address, contract) =>
          dispatch({ type: "UPDATE_CONTRACT", payload: { address, contract } }),
      }}
    >
      {children}
    </ContractsContext.Provider>
  );
};

export const useContracts = () => useContext(ContractsContext);
