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
              e.target.src =
                "https://uploads-ssl.webflow.com/616ab4741d375d1642c19027/61793ee65c891c190fcaa1d0_Vector(1).png";
            }}
          />
        ) : (
          <img
            src={
              "https://uploads-ssl.webflow.com/616ab4741d375d1642c19027/61793ee65c891c190fcaa1d0_Vector(1).png"
            }
            alt={label}
            className="h-auto w-full p-1"
          />
        )}
      </div>

      <div className="flex w-5/6 flex-col justify-between px-2">
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
