import * as OBC from "openbim-components";
import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import {loadEnvMap} from "../envMap";
import {RoadGeometry, RoadMaterial} from "@Components/Road/src";
import {Ground} from "./src/ground";
import {RoadMesh} from "./src/roadMesh";
import {Truck} from "./src/truck";
import {effect} from "@preact/signals-react";
import {storageModels} from "@signals/ListModel";
import {ifcLoader} from "..";
await RAPIER.init();
export class WalkThrough implements OBC.Disposable {
  enabled = true;
  readonly onDisposed = new OBC.Event<string>();
  private running = true;
  private gravity = {x: 0, y: -9.81, z: 0};
  private world = new RAPIER.World(this.gravity);
  // const clock = new THREE.Clock();
  private scene = new THREE.Scene();
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;

  private ground!: Ground;
  private roadMesh!: RoadMesh;
  private truck!: Truck;
  set setupEvent(enabled: boolean) {
    if (enabled) {
      window.addEventListener("resize", this.onResize);
    } else {
      window.removeEventListener("resize", this.onResize);
    }
  }
  //
  constructor(private container: HTMLDivElement) {
    this.init();
    this.gameLoop();
    this.renderLoop();
    this.setupEvent = true;
    effect(() => {
      for (const modelName of storageModels.value) {
        const model = ifcLoader.models.get(modelName);
        if (!model) continue;
        model.createCollider(this.world);
        this.scene.add(model);
      }
    });
  }

  async dispose() {
    this.enabled = false;
    this.setupEvent = false;
    this.renderer.renderLists.dispose();
    this.renderer.dispose();
    this.ground?.dispose();
    (this.ground as any) = null;
    this.roadMesh?.dispose();
    (this.roadMesh as any) = null;
    this.truck?.dispose();
    (this.truck as any) = null;
    for (const [_, model] of ifcLoader.models) {
      if (!model.parent) continue;
      model.removeFromParent();
    }
    await this.onDisposed.trigger();
    this.onDisposed.reset();
  }
  private init() {
    const {width, height} = this.container.getBoundingClientRect();
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.01, 1000);
    this.camera.position.set(0, 1, 3);
    // camera.lookAt( 0, 0, 0 );
    this.renderer = new THREE.WebGLRenderer({stencil: false});
    this.renderer.setSize(width, height);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.container.appendChild(this.renderer.domElement);
    loadEnvMap(this.renderer, "/env.webp").then((envMapRenderTarget: any) => {
      this.scene.environment = envMapRenderTarget.texture;
      this.scene.background = envMapRenderTarget.texture;
    });
    this.iniRoad();
  }
  private iniRoad() {
    this.roadMesh = new RoadMesh(this.world, this.scene);
    this.ground = new Ground(this.world, this.scene);
    this.truck = new Truck(this.world, this.scene, this.camera);
  }

  private onResize = () => {
    const {width, height} = this.container.getBoundingClientRect();
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };
  private gameLoop = () => {
    if (!this.running) return;
    const delta = 0.016;
    const res = setTimeout(this.gameLoop, delta * 1000);
    this.ground?.gameLoop();
    this.truck?.gameLoop(delta);
    if (!this.enabled) clearTimeout(res);
  };
  private renderLoop = () => {
    const res = requestAnimationFrame(this.renderLoop);
    this.renderer.render(this.scene, this.camera);
    if (!this.enabled) cancelAnimationFrame(res);
  };
}
