import React from "react";
import ReactDOM from "react-dom";

function Modal(props: React.PropsWithChildren<{ opened: boolean }>) {
    return props.opened ? ReactDOM.createPortal(
        <div className="bg-gray-500 bg-opacity-70 absolute top-0 left-0 right-0 bottom-0 flex justify-center items-center z-10 ">
            <div className="bg-graybg px-10 py-4  w-96 h-82 md:w-1/2 md:min-h-96 min-h-36 h-36 md:h-96 flex justify-center items-center relative ">
                {props.children}
            </div>
        </div>,
        document.getElementById("modal")!
    ) : null
}
export default Modal;
