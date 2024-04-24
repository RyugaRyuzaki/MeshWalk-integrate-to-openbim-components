import React, {Component, ComponentType, ReactElement} from "react";
import {Routes, Route} from "react-router-dom";
import {Helmet} from "react-helmet";
import {CarWalkThrough} from "@pages/viewer"; // Assuming Viewer is also imported from "./pages"
import {Error} from "./Error";
import MeshWalk from "@pages/viewer/MeshWalk";
interface IRouter {
  path: string;
  title: string;
  page: ComponentType<any>;
}
const routes: IRouter[] = [
  {
    path: "/",
    title: "Mesh Walk",
    page: MeshWalk,
  },
];
const BaseRoute = () => {
  return (
    <>
      <Routes>
        {routes.map((route: IRouter) => {
          const {path, title, page} = route;
          const Page = page;
          return (
            <Route
              key={route.path}
              path={route.path}
              element={
                <>
                  <Helmet>
                    <title>{route.title}</title>
                  </Helmet>
                  <Page />
                </>
              }
            />
          );
        })}
        <Route path="*" element={<Error message="Opp!" />} />
      </Routes>
    </>
  );
};

export default BaseRoute;
