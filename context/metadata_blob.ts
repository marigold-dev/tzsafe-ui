import { MichelsonMap } from "@taquito/taquito";
import { buf2hex } from "@taquito/utils";
import { IPFS } from "./config";

let meta = {
  name: "multisig",
  description: "Marigold Multisig Contract",
  version: "0.0.11",
  license: {
    name: "MIT",
  },
  authors: ["Marigold <contract@marigold.dev>"],
  homepage: "https://marigold.dev",
  source: {
    tools: "cameligo",
    location: "https://github.com/marigold-dev/multisig/",
  },
  interfaces: ["TZIP-016"],
};
let exported = {
  metadata: MichelsonMap.fromLiteral({
    "": buf2hex(Buffer.from("tezos-storage:contents")),
    contents: buf2hex(Buffer.from(JSON.stringify(meta))),
  }),
};
async function fromIpfs(): Promise<{
  metadata: MichelsonMap<any, unknown>;
}> {
  const formData = new FormData();
  let str = JSON.stringify(meta);
  const bytes = new TextEncoder().encode(str);
  const blob = new Blob([bytes], {
    type: "application/json;charset=utf-8",
  });
  formData.append("file", blob, "");
  let { cid } = await fetch(`${IPFS}/add`, {
    method: "POST",
    body: formData,
  }).then(res => res.json());
  return {
    metadata: MichelsonMap.fromLiteral({
      "": buf2hex(Buffer.from(`ipfs://${cid}`)),
    }),
  };
}

export default exported;
export { fromIpfs };
