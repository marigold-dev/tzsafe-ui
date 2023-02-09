import { MichelsonMap } from "@taquito/taquito";
import { buf2hex } from "@taquito/utils";

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

export default exported;
