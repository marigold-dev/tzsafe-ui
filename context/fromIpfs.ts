import { MichelsonMap } from "@taquito/taquito";
import { buf2hex } from "@taquito/utils";
import FormData from "form-data";
import fetch from "node-fetch";
import { IPFS } from "./config";

export default async function fromIpfs(meta: any): Promise<{
  metadata: MichelsonMap<any, unknown>;
}> {
  const formData = new FormData();
  const str = JSON.stringify(meta);

  // Create a buffer from the string
  const buffer = Buffer.from(str, "utf-8");

  // Append the buffer to formData
  formData.append("file", buffer, {
    contentType: "application/json",
    filename: "tzsafe-metadata.json",
  });

  const response = await fetch(`${IPFS}/add`, {
    method: "POST",
    body: formData,
  });

  const data = (await response.json()) as { cid: string };

  return {
    metadata: MichelsonMap.fromLiteral({
      "": buf2hex(Buffer.from(`ipfs://${data.cid}`)),
    }),
  };
}
