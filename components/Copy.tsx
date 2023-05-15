import { useEffect, useState } from "react";
import Tooltip from "./Tooltip";

export type copyProps = {
  children: React.ReactNode;
  value: string;
  disabled?: boolean;
  text?: string;
};

const Copy = ({ children, value, disabled = false, text }: copyProps) => {
  const [isCopying, setIsCopying] = useState(false);

  useEffect(() => {
    if (!isCopying) return;

    setTimeout(() => {
      setIsCopying(false);
    }, 1500);
  });

  return (
    <Tooltip
      text={isCopying ? "Copied" : text ?? "Copy"}
      disabled={disabled}
      visible={isCopying ? true : disabled ? false : undefined}
    >
      <a
        href="#"
        onClick={async e => {
          e.preventDefault();
          e.stopPropagation();
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
