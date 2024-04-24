import {effect, signal} from "@preact/signals-react";
export type ISelection = "None" | "Box" | "Building";
export type IMode = "Truck" | "Engineer" | "Miku";

export const listSelections: ISelection[] = ["None", "Box", "Building"];
export const currentSelection = signal<ISelection>(listSelections[0]);
export const walkThroughSignal = signal<boolean>(true);
export const soundSignal = signal<boolean>(false);
export const darkSceneSignal = signal<boolean>(false);

export const listModes: IMode[] = ["Truck", "Engineer"];
export const currentMode = signal<IMode>(listModes[0]);

const audio = new Audio("./Come_And_Get_Your_Love.mp3");
export function disposeModelSignal() {
  currentSelection.value = listSelections[0];
  walkThroughSignal.value = true;
  soundSignal.value = false;
  darkSceneSignal.value = false;
  currentMode.value = listModes[0];
  audio.pause();
}
effect(() => {
  if (soundSignal.value) {
    audio.currentTime = 0;
    audio.play();
  } else {
    audio.pause();
  }
});
