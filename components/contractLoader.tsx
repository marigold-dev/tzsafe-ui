import React, { FC } from "react";
import Spinner from "../components/Spinner";

const ContractLoader: FC<{
  loading: boolean;
  children?: React.ReactNode;
}> = props => {
  if (props.loading) {
    return (
      <div className="mt-8 flex justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto my-auto flex h-full w-full items-center justify-around space-x-4 md:space-x-0">
      {" "}
      {props.children}
    </div>
  );
};

export default ContractLoader;
