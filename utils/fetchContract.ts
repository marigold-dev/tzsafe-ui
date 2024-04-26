import { TezosToolkit } from "@taquito/taquito";
import { tzip16 } from "@taquito/tzip16";
import fetchVersion from "../context/version";
import { ContractStorage } from "../types/app";
import { toStorage } from "../versioned/apis";

export const fetchContract = async (
  connection: TezosToolkit,
  address: string
): Promise<ContractStorage | undefined> => {
  const c = await connection.wallet.at(address, tzip16);
  const version = await fetchVersion(c);

  if (version === "unknown version") return undefined;

  const balance = await connection.tz.getBalance(address);

  const cs: ContractStorage = await c.storage();

  return toStorage(version, cs, balance);
};

export const isTzSafeContract = async (
  connection: TezosToolkit,
  address: string
) => {
  const contract = await connection.wallet.at(address, tzip16);

  let version = await fetchVersion(contract!);

  return version !== "unknown version";
};
