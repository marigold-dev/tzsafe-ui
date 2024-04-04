import { useEffect, useState } from "react";
import { useAliases } from "../context/aliases";
import Copy from "./Copy";

const Alias = ({
  address,
  className,
  disabled = false,
  length = 5,
}: {
  address: string;
  className?: string;
  length?: number;
  disabled?: boolean;
}) => {
  const [alias, setAlias] = useState<string | undefined>(undefined);
  const aliasesCtx = useAliases();

  useEffect(() => {
    aliasesCtx.getAlias(address, length).then(setAlias);
  }, [address, aliasesCtx, length]);

  console;
  return (
    <Copy value={address} text="Copy address" disabled={disabled}>
      <span className={className} title={address}>
        {alias}
      </span>
    </Copy>
  );
};

export default Alias;
