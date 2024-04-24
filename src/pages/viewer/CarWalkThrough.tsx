import {WalkThrough} from "@Components/WalkThrough";
import React, {useEffect, useRef} from "react";

const CarWalkThrough = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const viewer = new WalkThrough(containerRef.current!);
    return () => {
      viewer?.dispose();
    };
  }, []);
  return <div className="relative h-full w-full" ref={containerRef}></div>;
};

export default CarWalkThrough;
