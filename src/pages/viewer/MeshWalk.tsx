import {MeshWalkComponent} from "@Components/MeshWalk";
import React, {useEffect, useRef} from "react";
import "./game.css";
const MeshWalk = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const viewer = new MeshWalkComponent(containerRef.current!);
    return () => {
      viewer?.dispose();
    };
  }, []);
  return <div className="relative h-full w-full " ref={containerRef}></div>;
};

export default MeshWalk;
