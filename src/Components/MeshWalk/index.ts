import * as OBC from "openbim-components";
import * as THREE from "three";
import {SimpleCamera} from "./SimpleCamera";
import {loadEnvMap} from "..";
import {IfcWorker} from "@Components/IfcWorker";
export class MeshWalkComponent implements OBC.Disposable {
  readonly onDisposed = new OBC.Event<any>();
  private components!: OBC.Components;

  constructor(private container: HTMLDivElement) {
    this.initScene();
  }
  async dispose() {
    await this.onDisposed.trigger();
    this.onDisposed.reset();
  }
  async initScene() {
    this.components = new OBC.Components();
    this.components.scene = new OBC.SimpleScene(this.components);
    this.components.renderer = new OBC.PostproductionRenderer(
      this.components,
      this.container
    );
    this.components.camera = new SimpleCamera(this.components);
    this.components.raycaster = new OBC.SimpleRaycaster(this.components);
    (this.components.camera.get() as THREE.PerspectiveCamera).far = 100000;
    this.components.init();

    (this.components.camera as OBC.SimpleCamera).controls.setLookAt(
      10,
      10,
      10,
      0,
      0,
      0
    );
    this.components.scene.get().add(new THREE.AmbientLight(0xffffff));
    const renderer = this.components.renderer.get();
    loadEnvMap(renderer, "/env.webp").then((envMapRenderTarget: any) => {
      this.components.scene.get().environment = envMapRenderTarget.texture;
      this.components.scene.get().background = envMapRenderTarget.texture;
    });
    this.components.tools.get(IfcWorker).enabled = true;
  }
}
