import { mutezTransfer } from "../types/display";

async function getProposals(bigmap: string) {
  let result = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/v1/bigmaps/${bigmap}/keys`
  );
  let json = await result.json();
  return json;
}
async function getTransfers(address: string): Promise<mutezTransfer[]> {
  try {
    let res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/v1/operations/transactions?target=${address}&status=applied&amount.gt=0`
    );
    return await res.json();
  } catch (e) {
    console.log(e);
    return [];
  }
}
export { getProposals, getTransfers };
