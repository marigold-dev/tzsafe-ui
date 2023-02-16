import React from "react";
import ReactDOM from "react-dom";

function Modal(props: React.PropsWithChildren<{ opened: boolean }>) {
  return props.opened
    ? ReactDOM.createPortal(
        <div className="overflow-y-none absolute top-0 left-0 right-0 bottom-0 z-10 flex h-fit min-h-full grow items-center justify-center bg-slate-800 bg-opacity-70">
          <div className="min-h-96 relative flex h-fit w-1/2 items-center justify-center  overflow-y-auto bg-graybg px-10 py-4 md:h-fit md:w-1/2 ">
            {props.children}
          </div>
        </div>,
        document.getElementById("modal")!
      )
    : null;
}
export default Modal;
