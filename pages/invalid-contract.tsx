import { NetworkType } from "@airgap/beacon-sdk";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PREFERED_NETWORK } from "../context/config";

export default function InvalidContract() {
  const searchParams = useSearchParams();

  const address = searchParams.get("address");

  return (
    <section
      className="flex flex-col items-center justify-center text-center text-white"
      style={{
        height: "calc(100vh - 12rem)",
      }}
    >
      <h1>
        Invalid contract:{" "}
        <a
          className="text-zinc-400 hover:text-white"
          href={`https://${
            PREFERED_NETWORK === NetworkType.GHOSTNET ? "ghostnet." : ""
          }tzkt.io/${address}`}
          target="_blank"
          rel="noreferrer"
        >
          {address}
        </a>
      </h1>
      <Link
        href="/"
        className="mt-4 rounded bg-primary px-4 py-2  hover:bg-red-500"
      >
        Go to home
      </Link>
    </section>
  );
}
