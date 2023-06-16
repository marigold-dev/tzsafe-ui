import { NetworkType } from "@airgap/beacon-sdk";
import { PREFERED_NETWORK } from "../context/config";

const Footer = ({
  shouldRemovePadding,
}: React.PropsWithChildren<{ shouldRemovePadding: boolean }>) => {
  return (
    <footer
      className={`absolute bottom-0 left-0 right-0 h-28 border-t-4 border-zinc-500 bg-dark text-center ${
        shouldRemovePadding ? "" : "md:left-72"
      } lg:text-left`}
    >
      <div className="flex flex-col items-center justify-center space-y-2 p-4 text-center text-white">
        <div className="flex flex-col items-center space-y-2 md:block md:space-x-6 md:space-y-0">
          <a
            href="https://www.marigold.dev/"
            target="_blank"
            rel="noreferrer"
            className="text-zinc-400"
          >
            ©{new Date().getFullYear()} Copyright Marigold
          </a>

          <a
            href="https://www.marigold.dev/contact"
            target="_blank"
            rel="noreferrer"
          >
            Contact
          </a>
          <a
            href="https://docs.tzsafe.marigold.dev/"
            target="_blank"
            rel="noreferrer"
          >
            Documentation
          </a>
          <a
            href={`https://${
              PREFERED_NETWORK === NetworkType.MAINNET ? "ghostnet." : ""
            }tzsafe.marigold.dev/`}
            target="_blank"
            rel="noreferrer"
          >
            {PREFERED_NETWORK === NetworkType.MAINNET
              ? "Tzsafe Ghostnet"
              : "Tzsafe Mainnet"}
          </a>
        </div>
        <a href="https://tzkt.io/" target="_blank" rel="noreferrer">
          Powered by TzKT API
        </a>
      </div>
    </footer>
  );
};
export default Footer;
