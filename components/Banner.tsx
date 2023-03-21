import { Cross1Icon } from "@radix-ui/react-icons";
import { useEffect, useState } from "react";

type props = {
  children: React.ReactNode;
};

const Banner = ({ children }: props) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    document.body.style.transform = isVisible ? "translateY(3rem)" : "";
  }, [isVisible]);

  return isVisible ? (
    <div className="fixed -top-12 flex h-12 w-full items-center justify-between bg-primary px-4 text-white">
      <div>{children}</div>
      <button onClick={() => setIsVisible(false)}>
        <Cross1Icon className="h-full" />
      </button>
    </div>
  ) : null;
};

export default Banner;
