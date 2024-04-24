import * as THREE from "three";
import * as OBC from "openbim-components";
import Stats from "stats.js";
import {loadEnvMap} from "../envMap";
export class Settings extends OBC.Component<any> implements OBC.Disposable {
  static readonly uuid = "9cfebee0-0bec-4a10-8eee-3199bfd2dc61" as const;
  private axes = new THREE.AxesHelper(5);
  private stats!: Stats;

  private ambientLight!: THREE.AmbientLight;
  private directionalLight!: THREE.DirectionalLight;
  enabled = false;

  get() {
    throw new Error("Method not implemented.");
  }

  /** {@link Disposable.onDisposed} */
  readonly onDisposed = new OBC.Event<string>();
  // Alternative scene and meshes to make the visibility check
  constructor(components: OBC.Components) {
    super(components);
    this.components.tools.add(Settings.uuid, this);
    this.init();
  }
  /** {@link Disposable.dispose} */
  async dispose() {
    this.enabled = false;
    this.axes.dispose();
    this.stats?.dom.remove();
    (this.stats as any) = null;
    this.directionalLight?.dispose();
    this.directionalLight?.removeFromParent();
    (this.directionalLight as any) = null;
    this.ambientLight?.dispose();
    this.ambientLight?.removeFromParent();
    (this.ambientLight as any) = null;
    await this.onDisposed.trigger(Settings.uuid);
    this.onDisposed.reset();
  }

  private init() {
    const scene = this.components.scene.get();
    scene.add(this.axes);
    const matrix = new THREE.Matrix4().set(
      1,
      0,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      -1,
      0,
      0,
      0,
      0,
      0,
      1
    );
    const matrixInverse = matrix.clone().transpose();
    scene.matrix.premultiply(matrix).multiply(matrixInverse);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(this.ambientLight);
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 3);
    this.directionalLight.position.set(100, 100, 100);
    this.directionalLight.target.position.set(0, 0, 0);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.bias = -0.001;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.1;
    this.directionalLight.shadow.camera.far = 1000.0;
    this.directionalLight.shadow.camera.left = 10;
    this.directionalLight.shadow.camera.right = -10;
    this.directionalLight.shadow.camera.top = 10;
    this.directionalLight.shadow.camera.bottom = -10;
    scene.add(this.directionalLight);
    scene.add(this.directionalLight.target);
    loadEnvMap(this.components.renderer.get(), "/env.webp").then(
      (envMapRenderTarget: any) => {
        scene.environment = envMapRenderTarget.texture;
        scene.background = envMapRenderTarget.texture;
      }
    );
    if (import.meta.env.DEV) {
      this.stats = new Stats();
      this.stats.showPanel(2);
      document.body.append(this.stats.dom);
      this.stats.dom.style.left = "0px";
      const renderer = this.components.renderer as OBC.PostproductionRenderer;
      renderer.onBeforeUpdate.add(() => this.stats.begin());
      renderer.onAfterUpdate.add(() => this.stats.end());
    }
  }
}
OBC.ToolComponent.libraryUUIDs.add(Settings.uuid);
