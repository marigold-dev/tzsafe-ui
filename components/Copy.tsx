import { useEffect, useState } from "react";
import Tooltip from "./Tooltip";

export type copyProps = {
  children: React.ReactNode;
  value: string;
  disabled?: boolean;
};

const Copy = ({ children, value, disabled = false }: copyProps) => {
  const [isCopying, setIsCopying] = useState(false);

  useEffect(() => {
    if (!isCopying) return;

    setTimeout(() => {
      setIsCopying(false);
    }, 1500);
  });

  return (
    <Tooltip
      text={isCopying ? "Copied" : "Copy"}
      disabled={disabled}
      visible={isCopying ? true : undefined}
    >
      <a
        href="#"
        onClick={async () => {
          if (disabled) return;

          setIsCopying(true);

          try {
            await navigator.clipboard.writeText(value);
          } catch (err) {
            console.error("Failed to copy: ", err);
          }
        }}
        data-name="copy"
      >
        {children}
      </a>
    </Tooltip>
  );
};

export default Copy;
