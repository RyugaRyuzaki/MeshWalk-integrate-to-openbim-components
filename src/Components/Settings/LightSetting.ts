import {ILightSettings} from "../types";
import * as THREE from "three";

export const LightSetting: ILightSettings = {
  skylight: {
    skyColor: new THREE.Color().setHSL(0.6, 1, 0.6),
    groundColor: new THREE.Color().setHSL(0.095, 1, 0.75),
    intensity: 0.8,
  },
  sunLights: [
    {
      position: new THREE.Vector3(-45.0, 40, -23),
      color: new THREE.Color().setHSL(0.1, 1, 0.95),
      intensity: 2,
    },
    {
      position: new THREE.Vector3(45.0, 40, 23),
      color: new THREE.Color().setHSL(0.1, 1, 0.95),
      intensity: 2,
    },
  ],
};
