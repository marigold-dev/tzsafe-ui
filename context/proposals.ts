import { mutezTransfer, tokenTransfer } from "../types/display";
import { Versioned } from "../versioned/interface";
import { TZKT_API_URL } from "./config";

function getTransfers(
  address: string,
  offset: number
): Promise<mutezTransfer[]> {
  return fetch(
    `${TZKT_API_URL}/v1/operations/transactions?target=${address}&status=applied&amount.gt=0&limit=${Versioned.FETCH_COUNT}&offset=${offset}&sort.desc=id`
  )
    .then(res => res.json())
    .catch(e => {
      console.log(e);

      return Promise.resolve([]);
    });
}

function getTokenTransfers(
  address: string,
  offset: number
): Promise<tokenTransfer[]> {
  return fetch(
    `${TZKT_API_URL}/v1/tokens/transfers?anyof.to_.to=${address}&sort.desc=id&limit=${Versioned.FETCH_COUNT}&offset=${offset}`
  )
    .then(res => res.json())
    .catch(e => {
      console.log(e);

      return Promise.resolve([]);
    });
}

export { getTransfers, getTokenTransfers };
