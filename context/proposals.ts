async function getProposals(bigmap: string) {
   let result = await fetch(`https://api.ghostnet.tzkt.io/v1/bigmaps/${bigmap}/keys`)
   let json = await result.json();
   return json
}
export { getProposals }
