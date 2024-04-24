import * as THREE from "three";
import * as OBC from "openbim-components";
const size = 400;
const depth = 0.01;
export class Ground implements OBC.Disposable {
  /** {@link Disposable.onDisposed} */
  readonly onDisposed = new OBC.Event<string>();
  private groundColorMap!: THREE.Texture;
  private groundNormalMap!: THREE.Texture;
  private loader = new THREE.TextureLoader();
  private geometry!: THREE.BoxGeometry;
  private material!: THREE.MeshStandardMaterial;
  groundMesh!: THREE.Mesh;
  /**
   *
   */
  constructor() {
    this.groundColorMap = this.loader.load("./ground-color.webp");
    this.groundNormalMap = this.loader.load("./ground-normal.webp");

    this.groundColorMap.repeat.set(100, 100);
    this.groundColorMap.wrapS = this.groundColorMap.wrapT =
      THREE.RepeatWrapping;
    this.groundColorMap.colorSpace = THREE.SRGBColorSpace;
    this.groundNormalMap.repeat.copy(this.groundColorMap.repeat);
    this.groundNormalMap.wrapS = this.groundNormalMap.wrapT =
      this.groundColorMap.wrapT;
    this.groundNormalMap.colorSpace = THREE.SRGBColorSpace;

    this.geometry = new THREE.BoxGeometry(size, depth, size);
    this.material = new THREE.MeshStandardMaterial({
      map: this.groundColorMap,
      normalMap: this.groundNormalMap,
      side: THREE.DoubleSide,
    });
    this.groundMesh = new THREE.Mesh(this.geometry, this.material);
    this.groundMesh.quaternion.setFromAxisAngle(
      new THREE.Vector3(0, 0, 1),
      0 * THREE.MathUtils.DEG2RAD
    );
  }
  async dispose() {
    this.groundColorMap?.dispose();
    this.groundNormalMap?.dispose();
    this.geometry?.dispose();
    this.material?.dispose();
    this.groundMesh?.removeFromParent();
    (this.groundMesh as any) = null;
    await this.onDisposed.trigger();
    this.onDisposed.reset();
  }
}
