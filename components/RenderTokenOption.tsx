import { MARIGOLD_LOGO_URL } from "../context/config";
import Alias from "./Alias";

type props = {
  label: string;
  tokenId: string;
  image: string | undefined;
  contractAddress: string;
};

const RenderTokenOption = ({
  image,
  tokenId,
  contractAddress,
  label,
}: props) => {
  return (
    <div className="flex grow">
      <div className="aspect-square w-12 overflow-hidden rounded bg-zinc-500/50">
        {!!image ? (
          <img
            src={image}
            alt={label}
            className="h-auto w-full p-1"
            onError={e => {
              // @ts-ignore
              e.target.src = MARIGOLD_LOGO_URL;
            }}
          />
        ) : (
          <img
            src={MARIGOLD_LOGO_URL}
            alt={label}
            className="h-auto w-full p-1"
          />
        )}
      </div>

      <div
        className="flex flex-col justify-between px-2"
        style={{
          width: "calc(100% - 3rem)",
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400">#{tokenId}</span>

          <Alias
            address={contractAddress}
            className="text-xs text-zinc-400"
            disabled
          />
        </div>
        <p
          className="max-h-8 w-full overflow-hidden text-ellipsis text-left text-xs"
          title={label}
        >
          {label}
        </p>
      </div>
    </div>
  );
};

export default RenderTokenOption;
