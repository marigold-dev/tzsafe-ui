import { PollingSubscribeProvider, TezosToolkit } from "@taquito/taquito";
import { Tzip12Module } from "@taquito/tzip12";
import {
  Handler,
  IpfsHttpHandler,
  MetadataProvider,
  TezosStorageHandler,
  Tzip16Module,
} from "@taquito/tzip16";
import React, { createContext, useEffect, useState } from "react";
import { IPFS_NODE, RPC_URL } from "./config";

type TzTkState = {
  tezos: TezosToolkit;
};

const createTezosConnection = () => {
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
  return connection;
};

export const TezosToolkitContext = createContext<TzTkState>({
  tezos: createTezosConnection(),
});

export const TezosToolkitProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const context = React.useContext(TezosToolkitContext);
  return (
    <TezosToolkitContext.Provider value={{ tezos: context.tezos }}>
      {children}
    </TezosToolkitContext.Provider>
  );
};

export const useTezosToolkit = () => React.useContext(TezosToolkitContext);
