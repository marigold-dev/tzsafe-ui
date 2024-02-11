import BigNumber from "bignumber.js";
import { daoVersion, multisigVersion } from "./display";

export type contractStorage =
  | ({ version: multisigVersion } & {
      [key: string]: any;
      proposal_counter: BigNumber;
      balance: string;
      threshold: BigNumber;
    })
  | ({ verison: daoVersion } & {
      [key: string]: any;
      proposal_counter: BigNumber;
      balance: string;
    });
