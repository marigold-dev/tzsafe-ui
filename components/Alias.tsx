import { useEffect, useState } from "react";
import { useAliases } from "../context/aliases";
import Copy from "./Copy";

const Alias = ({
  address,
  className,
  disabled = false,
  length = 5,
  defaultAlias = `${address.substring(0, length)}...${address.substring(
    address.length - length
  )}`,
}: {
  address: string;
  className?: string;
  length?: number;
  disabled?: boolean;
  defaultAlias?: string;
}) => {
  const [alias, setAlias] = useState<string | undefined>(undefined);
  const aliasesCtx = useAliases();

  useEffect(() => {
    aliasesCtx.getAlias(address, defaultAlias).then(setAlias);
  }, [address, aliasesCtx, defaultAlias]);

  return (
    <Copy value={address} text="Copy address" disabled={disabled}>
      <span className={className} title={address}>
        {alias}
      </span>
    </Copy>
  );
};

export default Alias;
