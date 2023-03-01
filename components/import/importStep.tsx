import React, { useContext } from "react";
import FormContext from "../../context/formContext";
import Aliases from "./aliases";
import Basic from "./basic";
import Success from "./importLoader";

function CreateStep() {
  const { activeStepIndex } = useContext(FormContext)!;

  return (
    <div className="mt-8 w-full">
      {(() => {
        switch (activeStepIndex) {
          case 0:
            return <Basic />;
          case 1:
            return <Aliases />;
          case 2:
            return <Success />;
          default:
            return null;
        }
      })()}
    </div>
  );
}

export default CreateStep;
