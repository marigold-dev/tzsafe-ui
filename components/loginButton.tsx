import { useContext } from "react";
import { PREFERED_NETWORK, RPC_URL } from "../context/config";
import { AppDispatchContext, AppStateContext } from "../context/state";
import { connectWallet } from "../utils/connectWallet";

const LoginButton = () => {
  const state = useContext(AppStateContext)!;
  const dispatch = useContext(AppDispatchContext)!;

  return (
    <button
      onClick={async () => {
        await connectWallet(state, dispatch);
      }}
      type="button"
      className="rounded-full p-1 text-primary hover:text-white focus:ring-white focus:ring-offset-2  focus:ring-offset-gray-800 md:bg-primary md:px-2 md:text-black"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-6 w-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a7.464 7.464 0 01-1.15 3.993m1.989 3.559A11.209 11.209 0 008.25 10.5a3.75 3.75 0 117.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 01-3.6 9.75m6.633-4.596a18.666 18.666 0 01-2.485 5.33"
        />
      </svg>
    </button>
  );
};
export default LoginButton;
