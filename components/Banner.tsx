import { Cross1Icon } from "@radix-ui/react-icons";
import { useState } from "react";

type props = {
  children: React.ReactNode;
};

const Banner = ({ children }: props) => {
  const [hasBanner, setHasBanner] = useState(true);

  return hasBanner ? (
    <div className="fixed top-0 z-50 flex h-12 w-full items-center justify-between bg-primary px-4 text-xs text-white md:text-base">
      <div>{children}</div>
      <button onClick={() => setHasBanner(false)}>
        <Cross1Icon className="h-full" />
      </button>
    </div>
  ) : null;
};

export default Banner;
