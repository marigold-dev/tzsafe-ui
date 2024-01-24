import { MichelsonMap } from "@taquito/taquito";
import { buf2hex } from "@taquito/utils";
import { IPFS } from "./config";

// Check if running in a Node.js environment
const isNode =
  typeof process !== "undefined" &&
  process.versions != null &&
  process.versions.node != null;

let FormDataNode: new () => any;
let fetch:
  | (((
      input: RequestInfo | URL,
      init?: RequestInit | undefined
    ) => Promise<Response>) &
      ((
        input: RequestInfo | URL,
        init?: RequestInit | undefined
      ) => Promise<Response>))
  | ((arg0: string, arg1: { method: string; body: any; headers: {} }) => any);

if (isNode) {
  FormDataNode = require("form-data");
  fetch = require("node-fetch");
} else {
  fetch = window.fetch; // Use the browser's fetch
}

export default async function fromIpfs(meta: any): Promise<{
  metadata: MichelsonMap<any, unknown>;
}> {
  const str = JSON.stringify(meta);

  let formData;
  let headers = {};

  if (isNode) {
    // Node.js environment
    formData = new FormDataNode();
    const buffer = Buffer.from(str, "utf-8");
    formData.append("file", buffer, "tzsafe-metadata.json");
    headers = formData.getHeaders();
  } else {
    // Browser environment
    formData = new FormData();
    const blob = new Blob([str], { type: "application/json" });
    formData.append("file", blob, "tzsafe-metadata.json");
  }

  const response = await fetch(`${IPFS}/add`, {
    method: "POST",
    body: formData,
    headers: headers,
  });

  const data = (await response.json()) as { cid: string };

  return {
    metadata: MichelsonMap.fromLiteral({
      "": buf2hex(Buffer.from(`ipfs://${data.cid}`)),
    }),
  };
}
