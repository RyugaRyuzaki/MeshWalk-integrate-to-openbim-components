import * as THREE from "three";
import * as OBC from "openbim-components";
import {RoadGeometry, RoadMaterial} from "./src";
import RAPIER from "@dimforge/rapier3d-compat";
import {convertToRigidBody} from "./src/convert-to-rigid-body";

export class RoadComponent
  extends OBC.Component<any>
  implements OBC.Disposable
{
  static readonly uuid = "45b211e1-402f-4a7d-82ff-bb64cc9ff54e" as const;
  private material = new RoadMaterial();
  private readonly maxMesh = 10000 as const;
  private readonly widthRoad = 20 as const;
  private length0 = 150;
  private width0 = 80;
  roads: THREE.InstancedMesh[] = [];
  roadMesh!: THREE.Mesh;
  private tempMatrix = new THREE.Matrix4();
  enabled = false;

  get(...args: any) {
    throw new Error("Method not implemented.");
  }

  /** {@link Disposable.onDisposed} */
  readonly onDisposed = new OBC.Event<string>();
  // Alternative scene and meshes to make the visibility check
  constructor(components: OBC.Components) {
    super(components);
    this.components.tools.add(RoadComponent.uuid, this);
    this.init();
  }
  /** {@link Disposable.dispose} */
  async dispose() {
    this.enabled = false;
    this.material.dispose();
    for (const road of this.roads) {
      (road.geometry as RoadGeometry).dispose();
    }
    await this.onDisposed.trigger(RoadComponent.uuid);
    this.onDisposed.reset();
  }
  private init() {
    const numberHorizontal = 10;
    const numberVertical = 10;
    const curvePath: THREE.CurvePath<THREE.Vector3> = new THREE.CurvePath();
    curvePath.add(
      new THREE.LineCurve3(
        new THREE.Vector3(this.length0 / 2, 0, 0),
        new THREE.Vector3(-this.length0 / 2, 0, 0.000001)
      )
    );
    const roadMesh = new THREE.InstancedMesh(
      new RoadGeometry(curvePath, 128, this.widthRoad, false),
      this.material.material,
      numberHorizontal * 2 + 1
    );
    for (let i = 1; i < numberHorizontal; i++) {
      this.tempMatrix.makeTranslation(0, 0, i * (this.width0 + this.widthRoad));
      roadMesh.setMatrixAt(i, this.tempMatrix);
      this.tempMatrix.makeTranslation(
        0,
        0,
        -i * (this.width0 + this.widthRoad)
      );
      roadMesh.setMatrixAt(i + numberHorizontal, this.tempMatrix);
    }
    roadMesh.instanceMatrix.needsUpdate = true;
    this.roads.push(roadMesh);
    this.components.scene.get().add(roadMesh);
  }
  createCollider(world: RAPIER.World) {
    const groundRigidBodyDesc = RAPIER.RigidBodyDesc.fixed();
    for (const mesh of this.roads) {
      const box = mesh.geometry.boundingBox;
      if (!box) continue;
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, this.tempMatrix);
        const newBox = box.clone().applyMatrix4(this.tempMatrix);
        const groundColliderDesc = this.createColliderDesc(newBox);
        const groundRigidBody = world.createRigidBody(groundRigidBodyDesc);
        world.createCollider(groundColliderDesc, groundRigidBody);
      }
    }
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
      ...v4.toArray(),
    ];
    const vertices = new Float32Array(array);

    const indices = new Uint32Array([0, 1, 2, 2, 0, 3]);
    return RAPIER.ColliderDesc.trimesh(vertices, indices)
      .setFriction(1)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
  }
}
OBC.ToolComponent.libraryUUIDs.add(RoadComponent.uuid);
