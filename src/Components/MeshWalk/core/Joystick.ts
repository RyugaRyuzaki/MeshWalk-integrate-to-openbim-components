import * as THREE from "three";
import {EventDispatcher} from "./EventDispatcher";

const _start = "pointerdown MSPointerDown touchstart mousedown";
const _move = "pointermove MSPointerMove touchmove  mousemove";
const _end = "pointerup   MSPointerUp   touchend   mouseup";

function getTemplate(width: number, halfWidth: number) {
  return [
    '<div class="gameinput-joystick">',
    // '<div class="gameinput-joystick__button"></div>',
    '<svg class="gameinput-frame" width="' +
      width +
      '" height="' +
      width +
      '" viewbox="0 0 64 64">',
    '<polygon points="32 19 34 21 30 21" fill="#fff"></polygon>',
    '<polygon points="45 32 43 34 43 30" fill="#fff"></polygon>',
    '<polygon points="32 45 34 43 30 43" fill="#fff"></polygon>',
    '<polygon points="19 32 21 34 21 30" fill="#fff"></polygon>',
    '<circle cx="32" cy="32" r="16" fill="none" stroke="#fff" stroke-width="' +
      halfWidth / 64 +
      '"></circle>',
    "</svg>",
    "</div>",
  ].join("");
}

export class Joystick extends EventDispatcher {
  private angle = 0;
  private position = new THREE.Vector2();
  private width = 0;
  private halfWidth = 0;
  private isActive = false;
  private pointerId = null;
  private frameRadius = 0;
  private buttonRadius = 32;
  private div = document.createElement("div");
  private button = document.createElement("div");
  set walkThrough(walkThrough: boolean) {
    if (!walkThrough) {
      this.div.remove();
    } else {
      this.container.appendChild(this.div);
    }
  }
  setupEvents(active: boolean) {
    if (active) {
      this.div.addEventListener("mousedown", this.onButtonDown);
      this.div.addEventListener("mouseup", this.onButtonUp);
      this.div.addEventListener("mousemove", this.onButtonMove);
    } else {
      this.div.removeEventListener("mousedown", this.onButtonDown);
      this.div.removeEventListener("mouseup", this.onButtonUp);
      this.div.removeEventListener("mousemove", this.onButtonMove);
    }
  }
  /**
   *
   */
  constructor(private container: HTMLDivElement, size: number, isLeft = true) {
    super();
    this.width = size * 2;
    this.halfWidth = size;
    const template = getTemplate(this.width, this.halfWidth);
    this.frameRadius = size / 2;
    this.div.style.position = "absolute";
    this.div.style.bottom = "240px";
    this.div.style.pointerEvents = "auto";
    if (!isLeft) this.div.style.right = 2 * size + "px";
    this.div.innerHTML = template;
    this.button.className = "gameinput-joystick__button";
    this.setCSSPosition(0, 0);
    this.div.appendChild(this.button);
    this.walkThrough = true;
  }
  dispose() {
    this.div.remove();
  }
  getLength(x: number, y: number) {
    return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
  }
  setPosition(x: number, y: number) {
    this.position.x = x;
    this.position.y = y;
    const length = this.getLength(x, y);
    const angle = this.getAngle(x, y);

    if (1 >= length) {
      this.setCSSPosition(x, y);
      return;
    }

    const pointOnRadius = this.getPointOnRadius(angle);
    this.setCSSPosition(pointOnRadius.x, pointOnRadius.y);
  }
  setCSSPosition(x: number, y: number) {
    this.button.style.left =
      this.halfWidth + x * this.frameRadius - this.buttonRadius + "px";
    this.button.style.top =
      this.halfWidth - y * this.frameRadius - this.buttonRadius + "px";
  }
  getAngle(lengthX: number, lengthY: number) {
    if (lengthX === 0 && lengthY === 0) {
      return this.angle;
    }

    let angle = Math.atan(lengthY / lengthX);

    if (0 > lengthX && 0 <= lengthY) {
      //the second quadrant
      angle += Math.PI;
    } else if (0 > lengthX && 0 > lengthY) {
      //the third quadrant
      angle += Math.PI;
    } else if (0 <= lengthX && 0 > lengthY) {
      //the fourth quadrant
      angle += Math.PI * 2;
    }

    this.angle = angle;
    return angle;
  }
  getPointOnRadius(angle: number) {
    return {
      x: Math.cos(angle),
      y: Math.sin(angle),
    };
  }
  getEventCoordinate(event: any) {
    let x = 0,
      y = 0,
      _event = null,
      i: number,
      l: number;

    if (event.pointerId) {
      if (this.pointerId === event.pointerId) {
        _event = event;
      }
    } else if (event.changedTouches) {
      for (i = 0, l = event.changedTouches.length; i < l; i++) {
        if (this.pointerId === event.changedTouches[i].identifier) {
          _event = event.changedTouches[i];
        }
      }
    } else {
      _event = event;
    }

    if (_event === null) {
      return false;
    }
    x =
      //@ts-ignore
      ((_event.clientX - this.halfWidth) / this.halfWidth) * 2;
    y =
      //@ts-ignore
      ((-_event.clientY + this.halfWidth) / this.halfWidth) * 2;

    return {x: x, y: y};
  }
  private onButtonDown = (event: any) => {
    event.preventDefault();
    event.stopPropagation();

    this.dispatchEvent({type: "active"});
    this.isActive = true;

    const coordinate = this.getEventCoordinate(event);

    if (!coordinate) {
      return;
    }

    this.setPosition(coordinate.x, coordinate.y);
  };
  private onButtonUp = (event: any) => {
    event.stopPropagation();

    let wasEventHappened = false;

    if (event.pointerId) {
      if (this.pointerId !== event.pointerId) {
        return;
      }
    } else if (event.changedTouches) {
      for (let i = 0, l = event.changedTouches.length; i < l; i++) {
        if (this.pointerId === event.changedTouches[i].identifier) {
          wasEventHappened = true;
          break;
        }

        if (!wasEventHappened) {
          return;
        }
      }
    }

    this.dispatchEvent({type: "disActive"});
    this.isActive = false;
    this.setPosition(0, 0);
  };
  private onButtonMove = (event: any) => {
    event.preventDefault();
    event.stopPropagation();
    if (!this.isActive) return;
    const coordinate = this.getEventCoordinate(event);

    if (!coordinate) {
      return;
    }

    this.setPosition(coordinate.x, coordinate.y);
  };
}
