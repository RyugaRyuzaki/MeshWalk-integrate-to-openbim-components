import {type RapierRaycastVehicle} from "./rapier-raycast-vehicle";
import {horn} from "./horn";
import {HOLD_EVENT_TYPE, KeyboardKeyHold, ElementHold} from "hold-event";

const maxForce = 200;
const maxSteer = 10;
const maxBrake = 10;

export const updateKeyInput = (vehicle: RapierRaycastVehicle) => {
  document.addEventListener("contextmenu", (event) => event.preventDefault());

  // keyboard
  const keyW = new KeyboardKeyHold("KeyW");
  const keyA = new KeyboardKeyHold("KeyA");
  const keyS = new KeyboardKeyHold("KeyS");
  const keyD = new KeyboardKeyHold("KeyD");
  const arrowUp = new KeyboardKeyHold("ArrowUp");
  const arrowDown = new KeyboardKeyHold("ArrowDown");
  const arrowLeft = new KeyboardKeyHold("ArrowLeft");
  const arrowRight = new KeyboardKeyHold("ArrowRight");
  const spaceKey = new KeyboardKeyHold("Space");
  const enterKey = new KeyboardKeyHold("Enter");

  // touch input
  const buttonUpEl = Object.assign(document.createElement("button"), {
    className: "Button ButtonUp",
    type: "button",
  });
  document.body.appendChild(buttonUpEl);
  const buttonUp = new ElementHold(buttonUpEl);

  const buttonLeftEl = Object.assign(document.createElement("button"), {
    className: "Button ButtonLeft",
    type: "button",
  });
  document.body.appendChild(buttonLeftEl);
  const buttonLeft = new ElementHold(buttonLeftEl);

  const buttonDownEl = Object.assign(document.createElement("button"), {
    className: "Button ButtonDown",
    type: "button",
  });
  document.body.appendChild(buttonDownEl);
  const buttonDown = new ElementHold(buttonDownEl);

  const buttonRightEl = Object.assign(document.createElement("button"), {
    className: "Button ButtonRight",
    type: "button",
  });
  document.body.appendChild(buttonRightEl);
  const buttonRight = new ElementHold(buttonRightEl);

  const buttonBreakEl = Object.assign(document.createElement("button"), {
    className: "Button ButtonBreak",
    type: "button",
  });
  document.body.appendChild(buttonBreakEl);
  const buttonBreak = new ElementHold(buttonBreakEl);
  const forward = keyW.holding || arrowUp.holding || buttonUp.holding;
  const left = keyA.holding || arrowLeft.holding || buttonLeft.holding;
  const backward = keyS.holding || arrowDown.holding || buttonDown.holding;
  const right = keyD.holding || arrowRight.holding || buttonRight.holding;
  const brake = spaceKey.holding || buttonBreak.holding;
  // update wheels from controls
  let engineForce = 0;
  let steering = 0;

  if (forward) engineForce += maxForce;
  if (backward) engineForce -= maxForce;
  if (left) steering += maxSteer;
  if (right) steering -= maxSteer;

  const brakeForce = brake ? maxBrake : 0;

  for (let i = 0; i < vehicle.wheels.length; i++) {
    vehicle.setBrakeValue(brakeForce, i);
  }

  // steer front wheels
  vehicle.setSteeringValue(steering, 0);
  vehicle.setSteeringValue(steering, 1);

  // apply engine force to back wheels
  vehicle.applyEngineForce(engineForce, 2);
  vehicle.applyEngineForce(engineForce, 3);

  forward
    ? buttonUpEl.classList.add("-active")
    : buttonUpEl.classList.remove("-active");
  left
    ? buttonLeftEl.classList.add("-active")
    : buttonLeftEl.classList.remove("-active");
  backward
    ? buttonDownEl.classList.add("-active")
    : buttonDownEl.classList.remove("-active");
  right
    ? buttonRightEl.classList.add("-active")
    : buttonRightEl.classList.remove("-active");
  brake
    ? buttonBreakEl.classList.add("-active")
    : buttonBreakEl.classList.remove("-active");

  // horn
  const buttonHornEl = Object.assign(document.createElement("button"), {
    className: "ButtonHorn",
    type: "button",
  });
  document.body.appendChild(buttonHornEl);
  buttonHornEl.addEventListener("pointerdown", () => horn.play());

  const hornStart = () => {
    horn.play();
    buttonHornEl.classList.add("-active");
  };
  const hornEnd = () => {
    buttonHornEl.classList.remove("-active");
  };

  enterKey.addEventListener(HOLD_EVENT_TYPE.HOLD_START, hornStart);
  enterKey.addEventListener(HOLD_EVENT_TYPE.HOLD_END, hornEnd);
};
