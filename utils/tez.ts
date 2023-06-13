import BN from "bignumber.js";

const MUTEZ_TEZ_RATIO = Math.pow(10, 6);

export const mutezToTez = (mutez: number): number =>
  new BN(mutez).div(MUTEZ_TEZ_RATIO).toNumber();

export const tezToMutez = (tez: number): number =>
  new BN(tez).multipliedBy(MUTEZ_TEZ_RATIO).toNumber();
