import { NetworkType } from "@airgap/beacon-sdk";

export const IPFS = "https://ipfs-proxy.gcp.marigold.dev";
export const IPFS_NODE = "ipfs.gcp.marigold.dev";
export const PREFERED_NETWORK = process.env.NEXT_PUBLIC_RPC_URL?.includes(
  "ghostnet"
)
  ? NetworkType.GHOSTNET
  : NetworkType.MAINNET;
