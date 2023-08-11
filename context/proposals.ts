import { mutezTransfer, tokenTransfer } from "../types/display";
import { API_URL } from "./config";

async function getProposals(bigmap: string) {
  let result = await fetch(`${API_URL}/v1/bigmaps/${bigmap}/keys`);
  let json = await result.json();
  return json;
}
async function getTransfers(address: string): Promise<mutezTransfer[]> {
  return fetch(
    `${API_URL}/v1/operations/transactions?target=${address}&status=applied&amount.gt=0`
  )
    .then(res => res.json())
    .catch(e => {
      console.log(e);

      return Promise.resolve([]);
    });
}

function getTokenTransfers(address: string): Promise<tokenTransfer[]> {
  return fetch(
    `${API_URL}/v1/tokens/transfers?anyof.to_.to=${address}&sort.desc=id`
  )
    .then(res => res.json())
    .catch(e => {
      console.log(e);

      return Promise.resolve([]);
    });
}

export { getProposals, getTransfers, getTokenTransfers };
