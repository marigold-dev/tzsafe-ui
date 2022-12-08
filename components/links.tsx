import React, { FC } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LinkComponent: FC<{ path: any; text: String }> = (
    props
) => {
    let route = usePathname();
    return (
        <Link
            href={props.path}
            className={`${route?.toString == props.path
                ? "bg-gray-900"
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
                } text-white block px-3 py-2 rounded-md md:text-sm text-base font-medium`}
            aria-current="page"
        >
            {props.text}
        </Link>
    );
};
export default LinkComponent;
