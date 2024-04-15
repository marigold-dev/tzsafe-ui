import { AccountInfo, LocalStorage } from "@airgap/beacon-sdk";
import { BeaconWallet } from "@taquito/beacon-wallet";
import { TezosToolkit } from "@taquito/taquito";
import React, { createContext, useEffect, useReducer } from "react";
import { PREFERED_NETWORK } from "../context/config";
import { RPC_URL } from "./config";
import { BeaconSigner } from "./signer";
import { useTezosToolkit } from "./tezos-toolkit";

type WalletState = {
  wallet: BeaconWallet | undefined;
  userAccount: AccountInfo | undefined;
  userAddress: string | undefined;
};

type WalletContextType = {
  connectWallet: () => void;
  disconnectWallet: () => void;
  state: WalletState;
};

const createWalletConnection = (tezos: TezosToolkit) => {
  const wallet = new BeaconWallet({
    name: "TzSafe",
    preferredNetwork: PREFERED_NETWORK,
    storage: new LocalStorage("WALLET"),
  });

  tezos.setProvider({
    rpc: RPC_URL,
    wallet,
  });
  tezos.setSignerProvider(new BeaconSigner(wallet));

  return wallet;
};

const initialState: WalletState = {
  wallet: undefined,
  userAccount: undefined,
  userAddress: undefined,
};

export const WalletContext = createContext<WalletContextType>({
  state: initialState,
  connectWallet: () => {},
  disconnectWallet: () => {},
});

const connectWallet = async (tezos: TezosToolkit) => {
  const wallet = createWalletConnection(tezos);

  await wallet.requestPermissions({
    network: {
      // @ts-ignore
      type: PREFERED_NETWORK,
      rpcUrl: RPC_URL,
    },
  });

  return await wallet.client.getActiveAccount().then(async userAccount => {
    const userAddress = await wallet.getPKH();

    return { wallet, userAddress, userAccount };
  });
};

const disconnectWallet = async (wallet?: BeaconWallet) => {
  if (!wallet) return Promise.reject("Error: No wallet. Can't disconnected.");

  wallet.clearActiveAccount();

  return Promise.resolve();
};

const reducer = (
  state: WalletState,
  action:
    | {
        type: "CONNECT_WALLET";
        payload: {
          wallet: BeaconWallet;
          userAddress: string;
          userAccount: AccountInfo | undefined;
        };
      }
    | {
        type: "DISCONNECT_WALLET";
      }
    | {
        type: "HYDRATE_WALLET";
        userAddress: string | undefined;
        userAccount: AccountInfo | undefined;
        wallet: BeaconWallet;
      }
) => {
  switch (action.type) {
    case "CONNECT_WALLET":
      return { ...state, ...action.payload };
    case "DISCONNECT_WALLET":
      return initialState;
    case "HYDRATE_WALLET": {
      const { userAddress, userAccount, wallet } = action;
      return { ...state, userAddress, userAccount, wallet };
    }
    default:
      return state;
  }
};

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const { tezos } = useTezosToolkit();

  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const wallet = createWalletConnection(tezos);

    wallet.client.getActiveAccount().then(userAccount => {
      dispatch({
        type: "HYDRATE_WALLET",
        userAddress: userAccount?.address,
        userAccount,
        wallet,
      });
    });
  }, [tezos]);

  return (
    <WalletContext.Provider
      value={{
        state,
        connectWallet: () =>
          connectWallet(tezos).then(payload =>
            dispatch({ type: "CONNECT_WALLET", payload })
          ),
        disconnectWallet: () =>
          disconnectWallet(state.wallet).then(() => {
            dispatch({ type: "DISCONNECT_WALLET" });
          }),
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => React.useContext(WalletContext);
