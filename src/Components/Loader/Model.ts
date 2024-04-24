import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";

export interface IInstancedMesh {
  material: THREE.MeshLambertMaterial;
  geometry: THREE.BufferGeometry;
}

export class Model extends THREE.Group {
  private static readonly xVector = new THREE.Vector3(1, 0, 0);
  private static readonly yVector = new THREE.Vector3(0, 1, 0);
  private meshes: Map<string, THREE.InstancedMesh> = new Map();
  private readonly maxMesh = 10000 as const;
  private boundingBox = new THREE.Box3();
  private center = new THREE.Vector3();
  private initializedCollider = false;
  private groundRigidBodyDesc = RAPIER.RigidBodyDesc.fixed();
  /**
   *
   */
  constructor(
    meshes: {[colID: string]: IInstancedMesh},
    readonly modelName: string
  ) {
    super();
    this.name = modelName;
    this.initMesh(meshes);
  }
  dispose() {
    for (const [_, mesh] of this.meshes) {
      this.disposeModel(mesh);
      mesh.dispose();
      mesh.removeFromParent();
    }
    this.meshes.clear();
  }
  private disposeModel(mesh: THREE.InstancedMesh) {
    const {geometry, material} = mesh;
    if (!geometry || !material) return;
    geometry.dispose();
    if (Array.isArray(material)) {
      material.forEach((mat: THREE.Material) => mat.dispose());
    } else {
      material.dispose();
    }
    mesh.removeFromParent();
    mesh.dispose();
  }
  private initMesh(meshes: {[colID: string]: IInstancedMesh}) {
    for (const colID in meshes) {
      this.getMesh(colID, meshes[colID], this.boundingBox);
    }
    const {max, min} = this.boundingBox;
    this.center.lerpVectors(min, max, 0.5);

    const matrix = new THREE.Matrix4().makeTranslation(
      -this.center.x,
      0,
      -this.center.z
    );
    for (const [_, mesh] of this.meshes) {
      mesh.setMatrixAt(0, matrix);
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
  private getMesh(
    colID: string,
    instance: IInstancedMesh,
    boundingBox: THREE.Box3
  ) {
    const {geometry, material} = instance;
    if (!this.meshes.has(colID)) {
      const mesh = new THREE.InstancedMesh(geometry, material, this.maxMesh);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.count = 1;
      this.add(mesh);
      this.meshes.set(colID, mesh);
    }
    if (!geometry.boundingBox) return;
    const {max, min} = geometry.boundingBox;
    if (max.x > boundingBox.max.x) boundingBox.max.x = max.x;
    if (max.y > boundingBox.max.y) boundingBox.max.y = max.y;
    if (max.z > boundingBox.max.z) boundingBox.max.z = max.z;
    if (min.x < boundingBox.min.x) boundingBox.min.x = min.x;
    if (min.y < boundingBox.min.y) boundingBox.min.y = min.y;
    if (min.z < boundingBox.min.z) boundingBox.min.z = min.z;
  }
  setMatrix(
    elevation: number,
    start: THREE.Vector3,
    end: THREE.Vector3,
    alignment: "left" | "right" | "front" | "back"
  ) {
    const {delta, direction} = this.getDelta(alignment);
    const dir = end.clone().sub(start.clone()).normalize();

    const angle = dir.angleTo(direction);

    const qua = new THREE.Quaternion().setFromAxisAngle(Model.yVector, angle);
    const scale = new THREE.Vector3(1, 1, 1);
    const number = start.distanceTo(end) / delta;
    const count = parseInt(number.toString());
    for (const [_, mesh] of this.meshes) {
      const oldCount = mesh.count;
      mesh.count = oldCount + count;
      for (let i = oldCount - 1; i < oldCount + count; i++) {
        const origin = start.clone().add(dir.clone().multiplyScalar(delta * i));
        origin.y = elevation;
        const matrix = new THREE.Matrix4().compose(origin, qua, scale);
        mesh.setMatrixAt(i, matrix);
        mesh.instanceMatrix.needsUpdate = true;
      }
    }
  }
  createCollider(world: RAPIER.World) {
    if (this.initializedCollider) return;
    const matrix = new THREE.Matrix4();
    for (const [_, mesh] of this.meshes) {
      const box = mesh.geometry.boundingBox;
      if (!box) continue;
      for (let i = 0; i < mesh.count; i++) {
        const newBox = box.clone();
        mesh.getMatrixAt(i, matrix);
        newBox.applyMatrix4(matrix);
        const groundColliderDesc = this.createColliderDesc(newBox);
        const groundRigidBody = world.createRigidBody(this.groundRigidBodyDesc);
        world.createCollider(groundColliderDesc, groundRigidBody);
      }
    }
    this.initializedCollider = true;
  }
  private createColliderDesc(box: THREE.Box3): RAPIER.ColliderDesc {
    const {max, min} = box;
    const v1 = new THREE.Vector3(max.x, min.y, max.z);
    const v2 = new THREE.Vector3(min.x, min.y, max.z);
    const v3 = new THREE.Vector3(min.x, min.y, min.z);
    const v4 = new THREE.Vector3(max.x, min.y, min.z);
    const array = [
      ...v1.toArray(),
      ...v2.toArray(),
      ...v3.toArray(),
      ...v3.toArray(),
      ...v1.toArray(),
      ...v4.toArray(),
    ];
    const vertices = new Float32Array(array);

    const indices = new Uint32Array([0, 1, 2, 3, 4, 5]);
    return RAPIER.ColliderDesc.trimesh(vertices, indices)
      .setFriction(1)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
  }
  private getDelta(alignment: "left" | "right" | "front" | "back") {
    const {max, min} = this.boundingBox;
    let delta = 0;
    const direction = new THREE.Vector3();
    if (alignment === "left") {
      delta = Math.abs(max.x - min.x);
      direction.x = -1;
    } else if (alignment === "right") {
      delta = Math.abs(max.x - min.x);
      direction.x = 1;
    } else if (alignment === "front") {
      delta = Math.abs(max.z - min.z);
      direction.z = -1;
    } else {
      delta = Math.abs(max.z - min.z);
      direction.z = 1;
    }
    return {delta, direction};
  }
}
