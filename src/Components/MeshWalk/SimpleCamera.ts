import * as THREE from "three";
import * as OBC from "openbim-components";
import {TPSCameraControls} from "./TPS/TPSCameraControls";
import {Octree} from "./core/Octree";
import {World} from "./core/World";
import {CharacterController} from "./core/CharacterController";
import {KeyInputControl} from "./TPS/KeyInputControl";
import {AnimationController} from "./TPS/AnimationController";
import {GLTF, GLTFLoader} from "three-stdlib";

import {effect} from "@preact/signals-react";
import {currentMode, listModes, walkThroughSignal} from "@signals/Modes";
import {Ground} from "./Ground";

export interface IControlMode {
  object: THREE.Object3D;
  animationController: AnimationController;
}
/**
 * A basic camera that uses
 * [yomotsu's cameracontrols](https://github.com/yomotsu/camera-controls) to
 * easily control the camera in 2D and 3D. Check out it's API to find out
 * what features it offers.
 */
export class SimpleCamera
  extends OBC.Component<THREE.PerspectiveCamera | THREE.OrthographicCamera>
  implements OBC.Updateable, OBC.Disposable
{
  /** {@link Updateable.onBeforeUpdate} */
  readonly onBeforeUpdate = new OBC.Event<SimpleCamera>();

  /** {@link Updateable.onAfterUpdate} */
  readonly onAfterUpdate = new OBC.Event<SimpleCamera>();

  readonly onAspectUpdated = new OBC.Event();

  /** {@link Disposable.onDisposed} */
  readonly onDisposed = new OBC.Event<string>();

  /**
   * The object that controls the camera. An instance of
   * [yomotsu's cameracontrols](https://github.com/yomotsu/camera-controls).
   * Transforming the camera directly will have no effect: you need to use this
   * object to move, rotate, look at objects, etc.
   */
  private controls!: TPSCameraControls;

  private world = new World();
  private octree = new Octree();
  private playerController!: CharacterController;
  private keyInputControl = new KeyInputControl();

  private characters: {[name: string]: IControlMode} = {};
  private terrain!: Ground;
  /** {@link Component.enabled} */
  get enabled() {
    return this.controls.enabled;
  }

  /** {@link Component.enabled} */
  set enabled(enabled: boolean) {
    this.controls.enabled = enabled;
  }

  private _walkThrough = true;
  set walkThrough(enabled: boolean) {
    this.controls!.walkThrough = enabled;
    if (!enabled) {
      this.currentCharacter = "";
    } else this.currentCharacter = this._currentCharacter;
  }
  get walkThrough() {
    return this._walkThrough;
  }
  private _currentCharacter = "";
  set currentCharacter(name: string) {
    if (!this.playerController) return;
    this._currentCharacter = name;
    const character = this.characters[name];
    if (!character) {
      this.playerController.object = null;
      this.controls.trackObject = null;
      return;
    }
    this.playerController.object = character.object;
    const {x, y, z} = character.object.position;
    this.playerController.teleport(x, y, z);
    this.controls.trackObject = character.object;
    this.controls.getMove();
  }
  /**
   *  The camera that is being used now according to the current {@link CameraProjection}.
   */
  activeCamera: THREE.PerspectiveCamera | THREE.OrthographicCamera;

  protected readonly _perspectiveCamera: THREE.PerspectiveCamera;

  constructor(components: OBC.Components) {
    super(components);
    this._perspectiveCamera = this.setupCamera();
    this.activeCamera = this._perspectiveCamera;
    this.setupCameraControls();
    this.setupObject();
    this.walkThrough = true;
    this.setupEvents(true);
    effect(() => {
      this.walkThrough = walkThroughSignal.value;
    });
  }

  /** {@link Component.get} */
  get() {
    return this.activeCamera;
  }

  /** {@link Disposable.dispose} */
  async dispose() {
    this.setupEvents(false);
    this.enabled = false;
    this.terrain?.dispose();
    this.onAspectUpdated.reset();
    this.onBeforeUpdate.reset();
    this.onAfterUpdate.reset();
    this._perspectiveCamera.removeFromParent();
    this.controls.dispose();
    this.keyInputControl.dispose();
    await this.onDisposed.trigger();
    this.onDisposed.reset();
  }

  /** {@link Updateable.update} */
  async update(delta: number) {
    if (this.enabled) {
      await this.onBeforeUpdate.trigger(this);
      if (this.walkThrough) {
        this.world?.fixedUpdate();
        for (const key in this.characters) {
          const {animationController} = this.characters[key];
          animationController?.update(delta);
        }
      }
      this.controls?.update(delta);
      await this.onAfterUpdate.trigger(this);
    }
  }
  /**
   * Updates the aspect of the camera to match the size of the
   * {@link Components.renderer}.
   */
  updateAspect = () => {
    if (this.components.renderer.isResizeable()) {
      const size = this.components.renderer.getSize();
      this._perspectiveCamera.aspect = size.width / size.height;
      this._perspectiveCamera.updateProjectionMatrix();
      this.onAspectUpdated.trigger();
    }
  };

  private setupCamera() {
    const aspect = window.innerWidth / window.innerHeight;
    const camera = new THREE.PerspectiveCamera(60, aspect, 1, 1000);
    camera.position.set(50, 50, 50);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    return camera;
  }

  private setupCameraControls() {
    this.world.add(this.octree);

    this.playerController = new CharacterController();

    this.world.add(this.playerController);

    this.controls = new TPSCameraControls(
      this._perspectiveCamera,
      this.components.renderer.get().domElement,
      this.world
    );
    this.controls.dollyToCursor = true;
    this.controls.infinityDolly = true;
    this.controls.setTarget(0, 0, 0);
  }

  private async setupObject() {
    const [Truck, Engineer] = await Promise.all([
      ...listModes.map((mode) => new GLTFLoader().loadAsync(`./${mode}.glb`)),
    ]);
    this.terrain = new Ground();
    this.components.scene.get().add(this.terrain.groundMesh);
    this.octree.addGraphNode(this.terrain.groundMesh);
    this.characters.Truck = this.setUpTruck(Truck);
    this.characters.Engineer = this.setUpEngineer(Engineer);
    effect(() => {
      this.currentCharacter = currentMode.value;
    });
  }
  addGraphModel(box: THREE.Box3) {
    this.octree.addGraphBox(box);
  }
  private setupEvents(active: boolean) {
    if (active) {
      window.addEventListener("resize", this.updateAspect);
      this.keyInputControl.addEventListener("movekeyon", this.movekeyon);
      this.keyInputControl.addEventListener("movekeyoff", this.movekeyoff);
      this.keyInputControl.addEventListener("jumpkeypress", this.jumpkeypress);
      this.keyInputControl.addEventListener(
        "movekeychange",
        this.movekeychange
      );

      this.controls.addEventListener("update", this.controlUpdate);

      this.playerController.addEventListener("startIdling", this.startIdling);
      this.playerController.addEventListener("startWalking", this.startWalking);
      this.playerController.addEventListener("startJumping", this.startJumping);
      this.playerController.addEventListener("startSliding", this.sliding);
      this.playerController.addEventListener("startFalling", this.sliding);
    } else {
      window.removeEventListener("resize", this.updateAspect);
      this.keyInputControl.removeEventListener("movekeyon", this.movekeyon);
      this.keyInputControl.removeEventListener("movekeyoff", this.movekeyoff);
      this.keyInputControl.removeEventListener(
        "jumpkeypress",
        this.jumpkeypress
      );
      this.keyInputControl.removeEventListener(
        "movekeychange",
        this.movekeychange
      );
      this.controls.removeEventListener("update", this.movekeychange);
      this.playerController.removeEventListener(
        "startIdling",
        this.startIdling
      );
      this.playerController.removeEventListener(
        "startWalking",
        this.startWalking
      );
      this.playerController.removeEventListener(
        "startJumping",
        this.startJumping
      );
      this.playerController.removeEventListener("startSliding", this.sliding);
      this.playerController.removeEventListener("startFalling", this.sliding);
    }
  }

  private movekeyon = () => {
    if (!this.walkThrough) return;
    this.playerController!.isRunning = true;
  };
  private movekeyoff = () => {
    if (!this.walkThrough) return;

    this.playerController!.isRunning = false;
  };
  private jumpkeypress = () => {
    if (!this.walkThrough) return;

    this.playerController?.jump();
  };
  private movekeychange = () => {
    if (!this.walkThrough) return;
    if (!this.playerController) return;
    const cameraFrontAngle = this.controls?.frontAngle;
    const characterFrontAngle = this.keyInputControl?.frontAngle;
    this.playerController!.direction = cameraFrontAngle + characterFrontAngle;
  };
  private controlUpdate = () => {
    if (!this.walkThrough) return;

    if (!this.playerController || !this.playerController.isRunning) return;
    const cameraFrontAngle = this.controls.frontAngle;
    const characterFrontAngle = this.keyInputControl.frontAngle;
    this.playerController.direction = cameraFrontAngle + characterFrontAngle;
  };
  private startIdling = () => {
    if (!this.walkThrough) return;
    this.setAnimation("Idle");
  };
  private startWalking = () => {
    if (!this.walkThrough) return;
    this.setAnimation("Walk");
  };
  private startJumping = () => {
    if (!this.walkThrough) return;
    this.setAnimation("jump");
  };
  private sliding = () => {
    if (!this.walkThrough) return;
    this.setAnimation("slide");
  };
  private setAnimation(action: string) {
    for (const key in this.characters) {
      if (key !== this._currentCharacter) continue;
      const {animationController} = this.characters[key];
      animationController?.play(action);
    }
  }
  private setUpTruck(truck: GLTF) {
    const object = truck.scene.children[0];
    const qua = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      Math.PI / 2
    );
    for (const child of object.children) {
      child.applyQuaternion(qua);
      child.position.y = 2.755;
    }
    const animationController = new AnimationController(
      truck.scene,
      truck.animations
    );
    object.position.y = 0;
    object.position.x = 10;
    object.position.z = 20;
    this.components.scene.get().add(object);
    return {object, animationController} as IControlMode;
  }
  private setUpEngineer(engineer: GLTF) {
    const object = engineer.scene.children[0];
    object.children[0].position.y = 1;
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(-10, 0, 20),
      new THREE.Quaternion(),
      new THREE.Vector3(0.02, 0.02, 0.02)
    );
    object.applyMatrix4(matrix);
    const animationController = new AnimationController(
      engineer.scene,
      engineer.animations
    );
    this.components.scene.get().add(object);
    return {object, animationController};
  }
  private setUpMiku(miku: GLTF) {
    const object = miku.scene;
    const animationController = new AnimationController(
      miku.scene,
      miku.animations
    );
    animationController.motion.jump.setLoop(THREE.LoopOnce, 0);
    animationController.motion.slide.setLoop(THREE.LoopOnce, 0);
    animationController.motion.jump.clampWhenFinished = true;
    animationController.motion.slide.clampWhenFinished = true;
    animationController.play("slide");
    this.components.scene.get().add(object);
    return {object, animationController};
  }
}
