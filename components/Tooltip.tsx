import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import React, { ReactNode } from "react";

type tooltipProps = {
  children: ReactNode;
  text: string;
  disabled?: boolean;
  visible?: boolean;
};

const Tooltip = ({
  children,
  text,
  disabled = false,
  visible,
}: tooltipProps) => {
  return (
    <TooltipPrimitive.Provider delayDuration={0}>
      <TooltipPrimitive.Root open={visible}>
        <TooltipPrimitive.Trigger asChild disabled={disabled}>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Content
          sideOffset={4}
          className="radix-side-top:animate-slide-down-fade radix-side-right:animate-slide-left-fade radix-side-bottom:animate-slide-up-fade radix-side-left:animate-slide-right-fade inline-flex items-center rounded-md bg-zinc-800 px-4 py-2.5 shadow-lg"
        >
          <TooltipPrimitive.Arrow className="fill-current text-zinc-800" />
          <span
            className={`{disabled ? 'pointer-events-none' : ''} block max-w-xs text-xs leading-none text-zinc-100`}
          >
            {text}
          </span>
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
};

export default Tooltip;
