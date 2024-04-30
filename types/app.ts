import BigNumber from "bignumber.js";
import { ParsedUrlQuery } from "querystring";
import { version } from "./display";

export type ContractStorage = { version: version } & {
  [key: string]: any;
  proposal_counter: BigNumber;
  balance: string;
  threshold: BigNumber;
  owners: Array<string>;
};
export type P2pData = {
  appUrl: string;
  id: string;
  name: string;
  publicKey: string;
  relayServer: string;
  type: string;
  version: string;
};

export type ConnectedDapps = {
  [address: string]: {
    [appUrl: string]: P2pData;
  };
};
export type Contracts = { [address: string]: ContractStorage };
export type Aliases = { [address: string]: string };

export interface ParsedUrlQueryContract extends ParsedUrlQuery {
  walletAddress: string | undefined;
}
