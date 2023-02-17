import { useContext, useEffect } from "react";
import FormContext from "../context/formContext";

function Stepper() {
  const activeStepIndex = useContext(FormContext)!.activeStepIndex;
  useEffect(() => {
    const stepperItems = document.querySelectorAll(".stepper-item");
    stepperItems.forEach((step, i) => {
      if (i <= activeStepIndex) {
        step.classList.add("bg-primary");
      } else {
        step.classList.remove("bg-primary");
      }
    });
  }, [activeStepIndex]);
  return (
    <div className="col-span-2 flex w-full flex-row items-center justify-center justify-self-center">
      <div className="stepper-item h-8 w-8 border-2 text-center font-medium text-white ">
        1
      </div>
      <div className="flex-auto border-t-2 border-white"></div>
      <div className="stepper-item h-8 w-8 border-2 border-white text-center font-medium text-white">
        2
      </div>
      <div className="flex-auto border-t-2 border-white"></div>
      <div className="stepper-item h-8 w-8 border-2 border-white text-center font-medium text-white">
        3
      </div>
    </div>
  );
}

export default Stepper;
