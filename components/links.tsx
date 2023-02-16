import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { FC } from "react";

const LinkComponent: FC<{ path: any; text: String }> = props => {
  let route = usePathname();
  return (
    <Link
      href={props.path}
      className={`${
        route?.toString == props.path
          ? "bg-gray-900"
          : "text-gray-300 hover:bg-gray-700 hover:text-white"
      } block rounded-md px-3 py-2 text-base font-medium text-white md:text-sm`}
      aria-current="page"
    >
      {props.text}
    </Link>
  );
};
export default LinkComponent;
