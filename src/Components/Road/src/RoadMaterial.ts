import * as OBC from "openbim-components";
import * as THREE from "three";

export class RoadMaterial implements OBC.Disposable {
  readonly onDisposed = new OBC.Event<any>();
  private colorMap = new THREE.TextureLoader().load("./road-color.webp");
  private normalMap = new THREE.TextureLoader().load("./road-normal.webp");
  private roughnessMap = new THREE.TextureLoader().load(
    "./road-roughness.webp"
  );
  private main!: THREE.MeshStandardMaterial;
  get material() {
    return this.main;
  }
  /**
   *
   */
  constructor() {
    this.colorMap.repeat.set(1, 10);
    this.colorMap.wrapT = THREE.RepeatWrapping;
    this.colorMap.colorSpace = THREE.SRGBColorSpace;
    this.normalMap.repeat.copy(this.colorMap.repeat);
    this.normalMap.wrapT = this.colorMap.wrapT;
    this.normalMap.colorSpace = THREE.SRGBColorSpace;
    this.roughnessMap.repeat.copy(this.colorMap.repeat);
    this.roughnessMap.wrapT = this.colorMap.wrapT;
    this.roughnessMap.colorSpace = THREE.SRGBColorSpace;
    this.main = new THREE.MeshStandardMaterial({
      map: this.colorMap,
      normalMap: this.normalMap,
      roughnessMap: this.roughnessMap,
      side: THREE.DoubleSide,
    });
  }

  async dispose() {
    this.colorMap.dispose();
    this.normalMap.dispose();
    this.roughnessMap.dispose();
    this.main?.dispose();
    await this.onDisposed.trigger();
    this.onDisposed.reset();
  }
}
