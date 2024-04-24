import React, {useEffect, useRef} from "react";

import LevaRoot from "./LevaRoot";
import {ToastContainer} from "react-toastify";
import {NotifyProgress} from "./Components/Notify";
import {fileProgressSignal} from "@signals/notify";
import {disposeSignal} from "@signals/dispose";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";
import BaseRoute from "./BaseRoute";
import {BrowserRouter} from "react-router-dom";
function App() {
  useEffect(() => {
    return () => {
      disposeSignal();
    };
  }, []);

  return (
    <>
      <BrowserRouter>
        <BaseRoute />
      </BrowserRouter>
      <LevaRoot />
      <ToastContainer
        position="bottom-right"
        autoClose={1000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        draggable
        theme="light"
      />
      <NotifyProgress name="File" signal={fileProgressSignal} />
    </>
  );
}

export default App;
