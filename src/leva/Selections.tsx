import {folder, useControls} from "leva";
import {
  currentMode,
  IMode,
  listModes,
  soundSignal,
  walkThroughSignal,
} from "@signals/Modes";

const Selections = () => {
  useControls(
    () => ({
      WalkThrough: {
        value: walkThroughSignal.value,
        label: "WalkThrough",
        onChange: (value: boolean) => {
          walkThroughSignal.value = value;
        },
      },
      Character: {
        options: listModes,
        onChange: (name: IMode) => {
          currentMode.value = name;
        },
        render: (get) => get("WalkThrough"),
      },
      Sound: {
        value: soundSignal.value,
        label: "SoundTrack",
        onChange: (value: boolean) => {
          soundSignal.value = value;
        },
      },
    }),
    [walkThroughSignal.value]
  );
  return null;
};

export default Selections;
