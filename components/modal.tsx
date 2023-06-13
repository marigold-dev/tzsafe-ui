import React, { useContext, useEffect } from "react";
import ReactDOM from "react-dom";
import { AppStateContext } from "../context/state";

function Modal(props: React.PropsWithChildren<{ opened: boolean }>) {
  const state = useContext(AppStateContext)!;

  useEffect(() => {
    document.body.style.overflow = props.opened ? "hidden" : "";
  }, [props.opened]);
  return props.opened
    ? ReactDOM.createPortal(
        <div
          className={`${
            state.hasBanner ? "top-12 md:top-32" : "top-0 md:top-20"
          } fixed bottom-0 left-0 right-0 z-50 flex h-fit min-h-full grow items-center justify-center bg-black bg-slate-800 bg-opacity-70 md:left-72`}
        >
          <div
            className={
              "min-h-96 absolute bottom-8 left-4 right-4 top-8 overflow-y-auto rounded bg-graybg px-4 py-12 md:bottom-auto md:left-12 md:right-auto md:top-1/2 md:h-fit md:w-2/3 md:-translate-y-2/3 md:translate-x-1/4 md:px-8"
            }
          >
            {props.children}
          </div>
        </div>,
        document.getElementById("modal")!
      )
    : null;
}
export default Modal;
