import { LocalStorage, getSenderId } from "@airgap/beacon-sdk";
import { createContext, useEffect, useReducer, useState } from "react";
import React from "react";
import { ConnectedDapps, P2pData } from "../types/app";
import { loadDapps, saveConnectedDappsToStorage } from "../utils/localStorage";
import P2PClient from "./P2PClient";
import { useWallet } from "./wallet";

type P2PContextType = {
  client: P2PClient | null;
  connectedDapps: ConnectedDapps;
  addDapp(contractAddress: string, data: P2pData): void;
  removeDapp(data: P2pData, contractAddress: string): void;
  getDappsByContract(
    contractAddress: string
  ): { [appUrl: string]: P2pData } | undefined;
};

type DappsActions =
  | {
      type: "ADD_DAPP";
      payload: {
        data: P2pData;
        contractAddress: string;
      };
    }
  | {
      type: "REMOVE_DAPP";
      payload: { dappUrl: string; contractAddress: string };
    }
  | { type: "LOAD_DAPPS"; payload: { dApps: ConnectedDapps } };

const P2PContext = createContext<P2PContextType>({
  client: new P2PClient({
    name: "TzSafe",
    storage: new LocalStorage("P2P"),
  }),
  connectedDapps: {},
  addDapp: () => {},
  removeDapp: () => {},
  getDappsByContract: () => ({}),
});

const createP2PClientConnection = async () => {
  const p2pClient = new P2PClient({
    name: "TzSafe",
    storage: new LocalStorage("P2P"),
  });

  await p2pClient.init();
  await p2pClient.connect(p2pClient.handleMessages);

  return p2pClient;
};

const removeDappConnection = async (data: P2pData, client: P2PClient) => {
  const senderId = await getSenderId(data.publicKey);

  client.removePeer(
    {
      ...data,
      type: "p2p-pairing-response",
      senderId,
    },
    true
  );

  await client.removeAppMetadata(senderId);
};

const connectToDapps = (connectedDapps: ConnectedDapps, client: P2PClient) => {
  // Connect stored peers
  Object.entries(connectedDapps).forEach(async ([address, dapps]) => {
    Object.values(dapps).forEach(data => {
      client
        .addPeer(data)
        .catch(_ => console.log("Failed to connect to peer", data));
    });
  });
};

const reducer = (state: ConnectedDapps, action: DappsActions) => {
  switch (action.type) {
    case "ADD_DAPP":
      const p = action.payload;
      const newApp = { ...state[p.contractAddress], [p.data.appUrl]: p.data };
      return {
        ...state,
        [p.contractAddress]: { ...state[p.contractAddress], ...newApp },
      };
    case "REMOVE_DAPP":
      const {
        [action.payload.contractAddress]: {
          [action.payload.dappUrl]: dapp,
          ...othersApps
        },
        ...connectedDapps
      } = state;
      return { ...state, ...{ ...connectedDapps, othersApps } };
    case "LOAD_DAPPS":
      return action.payload.dApps;
    default:
      return state;
  }
};

export const P2PProvider = ({ children }: { children: React.ReactNode }) => {
  const { userAddress } = useWallet();
  const [client, setClient] = useState<P2PClient | null>(null);

  const [state, dispatch] = useReducer(reducer, {});

  useEffect(() => {
    createP2PClientConnection().then(setClient);
  }, []);

  useEffect(() => {
    const dApps = userAddress ? loadDapps(userAddress) : {};
    dispatch({ type: "LOAD_DAPPS", payload: { dApps: dApps ?? {} } });
    if (client) connectToDapps(state, client);
  }, [userAddress]);

  // Save state to storage when state is updated
  useEffect(() => {
    if (Object.keys(state).length !== 0)
      saveConnectedDappsToStorage(userAddress || "", state);
  }, [state, userAddress]);

  if (!client) {
    return null;
  }
  return (
    <P2PContext.Provider
      value={{
        client,
        connectedDapps: state,
        addDapp: (contractAddress, data) =>
          dispatch({
            type: "ADD_DAPP",
            payload: { contractAddress, data },
          }),
        removeDapp: async (data, contractAddress) => {
          await removeDappConnection(data, client);
          dispatch({
            type: "REMOVE_DAPP",
            payload: { dappUrl: data.appUrl, contractAddress },
          });
        },
        getDappsByContract: contractAddress => state[contractAddress],
      }}
    >
      {children}
    </P2PContext.Provider>
  );
};

export const useP2PClient = () => {
  const p2pClient = React.useContext(P2PContext).client;
  if (!p2pClient) {
    throw new Error("P2PClient not initialized");
  }
  return p2pClient;
};

export const useDapps = () => {
  const { client, ...ctx } = React.useContext(P2PContext);
  return ctx;
};
