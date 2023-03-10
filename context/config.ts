import { NetworkType } from "@airgap/beacon-sdk";

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://ghostnet.tezos.marigold.dev/";
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.ghostnet.tzkt.io";
export const IPFS = "https://ipfs-proxy.gcp.marigold.dev";
export const IPFS_NODE = "ipfs.gcp.marigold.dev";
export const PREFERED_NETWORK =
  process.env.NEXT_PUBLIC_NETWORK_TYPE === "mainnet"
    ? NetworkType.MAINNET
    : NetworkType.GHOSTNET;

export const DEFAULT_TIMEOUT = 60000;
