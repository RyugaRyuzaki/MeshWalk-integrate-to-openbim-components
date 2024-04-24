import * as OBC from "openbim-components";
import {Culling} from "./Culling";
import {Loader} from "./Loader";
import {Settings} from "./Settings";
import {RoadComponent} from "./Road";
export class BimModel implements OBC.Disposable {
  readonly onDisposed = new OBC.Event<any>();
  private components!: OBC.Components;
  /**
   *
   */
  constructor(private container: HTMLDivElement) {
    this.initScene();
  }
  async dispose() {
    this.components?.dispose();
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
    this.components.camera = new OBC.SimpleCamera(this.components);
    this.components.raycaster = new OBC.SimpleRaycaster(this.components);
    (this.components.camera.get() as THREE.PerspectiveCamera).far = 100000;
    this.components.init();

    (this.components.camera as OBC.SimpleCamera).controls.setLookAt(
      100,
      100,
      100,
      0,
      0,
      0
    );

    // highlight
    const settings = this.components.tools.get(Settings);
    settings.enabled = true;
    const culling = this.components.tools.get(Culling);
    culling.enabled = true;
    const road = this.components.tools.get(RoadComponent);
    road.enabled = true;
  }
}
