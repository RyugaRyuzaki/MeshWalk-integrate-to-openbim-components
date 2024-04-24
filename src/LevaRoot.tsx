import React from "react";

import {Leva} from "leva";
import {Models, Selections} from "./leva";

const LevaRoot = () => {
  return (
    <>
      <Leva titleBar={{title: "Manager", drag: true}} isRoot />
      <Models />
      <Selections />
    </>
  );
};

export default LevaRoot;
