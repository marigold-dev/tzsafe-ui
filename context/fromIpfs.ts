import { MichelsonMap } from "@taquito/taquito";
import { buf2hex } from "@taquito/utils";
import { IPFS } from "./config";

export default async function fromIpfs(meta: any): Promise<{
  metadata: MichelsonMap<any, unknown>;
}> {
  const formData = new FormData();
  let str = JSON.stringify(meta);
  const bytes = new TextEncoder().encode(str);
  const blob = new Blob([bytes], {
    type: "application/json;charset=utf-8",
  });
  formData.append("file", blob, "tzsafe-metdata.json");
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
