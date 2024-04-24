import {computed, signal} from "@preact/signals-react";
import * as THREE from "three";

export interface IRoadSetting {
  elevation: number;
  start: THREE.Vector3;
  end: THREE.Vector3;
  alignment: "left" | "right" | "front" | "back";
}
export const listModels = [
  "None",
  "VILLA",
  "SCHOOL",
  "SMALLHOUSE",
  "Open Local",
];
export const currentModel = signal<string>(listModels[0]);
export const storageModels = signal<string[]>([]);
export const loading = signal<boolean>(false);
export const canLoad = computed(() => {
  return currentModel.value === listModels[0] || loading.value;
});
export function disposeModelSignal() {
  currentModel.value = listModels[0];
  loading.value = false;
  storageModels.value = [];
}
const p0 = new THREE.Vector3(0, 0, -10.00001);
const p1 = new THREE.Vector3(0, 0, -1000.000001);
// const p2 = new THREE.Vector3(20, 0, -110.000001);
// const p3 = new THREE.Vector3(120, 0, -110.000001);
// const p4 = new THREE.Vector3(140, 0, -90.000001);
// const p5 = new THREE.Vector3(140, 0, 90.000001);
// const p6 = new THREE.Vector3(120, 0, 110.000001);
// const p7 = new THREE.Vector3(20, 0, 110.000001);
// const p8 = new THREE.Vector3(0, 0, 90.000001);
// const p9 = new THREE.Vector3(0, 0, 20.000001);
export const RoadPoints: THREE.Vector3[] = [
  p0,
  p1,
  // p2,
  // p3,
  // p4,
  // p5,
  // p6,
  // p7,
  // p8,
  // p9,
];
