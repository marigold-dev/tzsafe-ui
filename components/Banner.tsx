import { Cross1Icon } from "@radix-ui/react-icons";
import { useContext } from "react";
import { AppDispatchContext, AppStateContext } from "../context/state";

type props = {
  children: React.ReactNode;
};

const Banner = ({ children }: props) => {
  const state = useContext(AppStateContext)!;
  const dispatch = useContext(AppDispatchContext)!;

  return state.hasBanner ? (
    <div className="fixed top-0 z-50 flex h-12 w-full items-center justify-between bg-primary px-4 text-xs text-white md:text-base">
      <div>{children}</div>
      <button onClick={() => dispatch({ type: "setBanner", payload: false })}>
        <Cross1Icon className="h-full" />
      </button>
    </div>
  ) : null;
};

export default Banner;
