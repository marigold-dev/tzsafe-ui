import { TezosToolkit } from "@taquito/taquito";
import { tzip16 } from "@taquito/tzip16";
import fetchVersion from "../context/version";
import { contractStorage } from "../types/app";
import { toStorage } from "../versioned/apis";

export const fetchContract = async (
  connection: TezosToolkit,
  address: string
): Promise<contractStorage | undefined> => {
  let c = await connection.contract.at(address, tzip16);
  let version = await fetchVersion(c);

  if (version === "unknown version") return undefined;

  let balance = await connection.tz.getBalance(address);

  let cc = await c.storage();

  return toStorage(version, cc, balance);
};

export const isTzSafeContract = async (
  connection: TezosToolkit,
  address: string
) => {
  const contract = await connection.contract.at(address, tzip16);

  let version = await fetchVersion(contract!);

  return version !== "unknown version";
};
