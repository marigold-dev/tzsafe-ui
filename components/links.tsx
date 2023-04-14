import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { FC } from "react";

const LinkComponent: FC<{
  path: any;
  text: String;
  onClick?: () => void;
}> = props => {
  const route = usePathname();

  return (
    <Link
      href={props.path}
      onClick={props.onClick}
      className={`${
        route?.toString == props.path
          ? "bg-zinc-900"
          : "text-zinc-300 hover:bg-zinc-700 hover:text-white"
      } block rounded-md px-3 py-2 text-base font-medium text-white md:text-sm`}
      aria-current="page"
    >
      {props.text}
    </Link>
  );
};
export default LinkComponent;
