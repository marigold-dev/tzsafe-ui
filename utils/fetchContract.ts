import { TezosToolkit } from "@taquito/taquito";
import { tzip16 } from "@taquito/tzip16";
import BigNumber from "bignumber.js";
import fetchVersion from "../context/metadata";
import { version } from "../types/display";

export type storageAndVersion = {
  effective_period: BigNumber;
  owners: string[];
  proposal_counter: BigNumber;
  threshold: BigNumber;
  version: version;
  balance: BigNumber;
};

export const fetchContract = async (
  connection: TezosToolkit,
  address: string
): Promise<storageAndVersion> => {
  const c = await connection.contract.at(address, tzip16);
  const balance = await connection.tz.getBalance(address);

  const cc = (await c.storage()) as storageAndVersion;
  const version = await fetchVersion(c);

  return {
    ...cc,
    version,
    balance,
  };
};

export const isTzSafeContract = async (
  connection: TezosToolkit,
  address: string
) => {
  const contract = await connection.contract.at(address, tzip16);
  const storage: any = await contract.storage();
  let version = await fetchVersion(contract!);

  return version !== "unknown version";
};
