import * as OBC from "openbim-components";
import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import {RoadGeometry, RoadMaterial} from "@Components/Road/src";
import {convertToRigidBody} from "@Components/Road/src/convert-to-rigid-body";
import {RoadPoints} from "@signals/ListModel";

export class RoadMesh implements OBC.Disposable {
  readonly onDisposed = new OBC.Event<string>();
  private material = new RoadMaterial();
  private geometry!: RoadGeometry;
  private readonly maxMesh = 10000 as const;
  private readonly widthRoad = 20 as const;
  private length0 = 150;
  private width0 = 80;
  private tempMatrix = new THREE.Matrix4();
  mesh!: THREE.Mesh;
  /**
   */
  constructor(private world: RAPIER.World, private scene: THREE.Scene) {
    this.mesh = new THREE.Mesh(
      new RoadGeometry(this.createCurvePath(), 128, this.widthRoad, false),
      this.material.material
    );
    this.scene.add(this.mesh);
    convertToRigidBody(this.mesh, this.world);
  }
  async dispose() {
    this.geometry?.dispose();
    this.material?.dispose();
    this.mesh?.removeFromParent();
    (this.mesh as any) = null;
    await this.onDisposed.trigger();
    this.onDisposed.reset();
  }
  private createCurvePath(): THREE.CurvePath<THREE.Vector3> {
    const curvePath: THREE.CurvePath<THREE.Vector3> = new THREE.CurvePath();
    for (let i = 0; i < RoadPoints.length - 1; i++) {
      curvePath.add(new THREE.LineCurve3(RoadPoints[i], RoadPoints[i + 1]));
    }

    return curvePath;
  }
}
