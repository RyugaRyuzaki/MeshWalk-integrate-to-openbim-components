import * as OBC from "openbim-components";
import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import {GLTFLoader} from "three-stdlib";
import {RapierRaycastVehicle} from "./rapier-raycast-vehicle";
import {updateKeyInput} from "./controls";

export class Truck implements OBC.Disposable {
  readonly onDisposed = new OBC.Event<string>();
  private loader = new GLTFLoader();
  private carBodyMesh!: THREE.Mesh;
  private carBodyMeshSize!: THREE.Vector3;

  private tireFrontLeftMesh!: THREE.Mesh;
  private tireFrontRightMesh!: THREE.Mesh;
  private tireRearLeftMesh!: THREE.Mesh;
  private tireRearRightMesh!: THREE.Mesh;
  private tireMeshSize!: THREE.Vector3;
  private tireRadius = 0;
  private tireWidth = 0;
  private commonWheelOptions = {
    radius: 0,

    directionLocal: new THREE.Vector3(0, -1, 0),
    axleLocal: new THREE.Vector3(0, 0, 1),

    suspensionStiffness: 30,
    suspensionRestLength: 0.3,
    maxSuspensionForce: 100000,
    maxSuspensionTravel: 0.3,

    sideFrictionStiffness: 1,
    frictionSlip: 1.4,
    dampingRelaxation: 2.3,
    dampingCompression: 4.4,

    rollInfluence: 0.01,

    customSlidingRotationalSpeed: -30,
    useCustomSlidingRotationalSpeed: true,

    forwardAcceleration: 1,
    sideAcceleration: 1,
  };

  private indexRightAxis = 2;
  private indexForwardAxis = 0;
  private indexUpAxis = 1;

  private vehicleWidth = 0;
  private vehicleHeight = -0.38;
  private vehicleFront = 0.7;
  private vehicleRear = -0.9;
  private wheelParams!: any[];

  private raycastVehicle!: RapierRaycastVehicle;
  private chassisRigidBody!: RAPIER.RigidBody;
  /**
   *
   */
  constructor(
    private world: RAPIER.World,
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera
  ) {
    (async () => {
      const gltf = await this.loader.loadAsync("/car.glb");
      gltf.scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;

        const geometry = object.geometry;
        geometry.rotateY(Math.PI / 2);
      });

      this.carBodyMesh = gltf.scene.children[0] as THREE.Mesh;
      this.carBodyMeshSize = new THREE.Box3()
        .setFromObject(this.carBodyMesh)
        .getSize(new THREE.Vector3());

      this.tireFrontLeftMesh = gltf.scene.children[1] as THREE.Mesh;
      this.tireFrontRightMesh = this.tireFrontLeftMesh.clone();
      this.tireRearLeftMesh = this.tireFrontLeftMesh.clone();
      this.tireRearRightMesh = this.tireFrontLeftMesh.clone();

      this.tireMeshSize = new THREE.Box3()
        .setFromObject(this.tireFrontLeftMesh)
        .getSize(new THREE.Vector3());
      this.tireRadius = this.tireMeshSize.x / 2;
      this.tireWidth = this.tireMeshSize.z;

      this.scene.add(
        this.carBodyMesh,
        this.tireFrontLeftMesh,
        this.tireFrontRightMesh,
        this.tireRearLeftMesh,
        this.tireRearRightMesh
      );

      const chassisRigidBodyDesc = RAPIER.RigidBodyDesc.dynamic();
      this.chassisRigidBody = this.world.createRigidBody(chassisRigidBodyDesc);
      this.chassisRigidBody.setTranslation(new THREE.Vector3(0, 4, 0), true);
      this.chassisRigidBody.setRotation(
        new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          Math.PI / 2
        ),
        true
      );
      const halfExtents = [
        this.carBodyMeshSize.x / 2,
        this.carBodyMeshSize.y / 2,
        this.carBodyMeshSize.z / 2,
      ] as const;
      const chassisColliderDesc = RAPIER.ColliderDesc.cuboid(
        ...halfExtents
      ).setMass(120);
      //@ts-ignore
      const chassisCollider = this.world.createCollider(
        chassisColliderDesc,
        this.chassisRigidBody
      );

      this.raycastVehicle = new RapierRaycastVehicle({
        world,
        chassisRigidBody: this.chassisRigidBody,
        indexRightAxis: this.indexRightAxis,
        indexForwardAxis: this.indexForwardAxis,
        indexUpAxis: this.indexUpAxis,
      });
      this.commonWheelOptions.radius = this.tireRadius;

      this.vehicleWidth = this.carBodyMeshSize.z;
      this.wheelParams = [
        {
          // topLeft,
          ...this.commonWheelOptions,
          chassisConnectionPointLocal: new THREE.Vector3(
            this.vehicleFront,
            this.vehicleHeight,
            this.vehicleWidth * 0.5 - this.tireWidth
          ),
        },
        {
          // topRight,
          ...this.commonWheelOptions,
          chassisConnectionPointLocal: new THREE.Vector3(
            this.vehicleFront,
            this.vehicleHeight,
            this.vehicleWidth * -0.5 + this.tireWidth
          ),
        },
        {
          // bottomLeft,
          ...this.commonWheelOptions,
          chassisConnectionPointLocal: new THREE.Vector3(
            this.vehicleRear,
            this.vehicleHeight,
            this.vehicleWidth * 0.5 - this.tireWidth
          ),
        },
        {
          // bottomRight,
          ...this.commonWheelOptions,
          chassisConnectionPointLocal: new THREE.Vector3(
            this.vehicleRear,
            this.vehicleHeight,
            this.vehicleWidth * -0.5 + this.tireWidth
          ),
        },
      ];
      for (let i = 0; i < this.wheelParams.length; i++) {
        this.raycastVehicle.addWheel(this.wheelParams[i]);
      }
    })();
  }
  async dispose() {
    await this.onDisposed.trigger();
    this.onDisposed.reset();
  }
  private cameraIdealOffset = new THREE.Vector3();
  private cameraIdealLookAt = new THREE.Vector3();
  private currentCameraPosition = new THREE.Vector3();
  private currentCameraLookAt = new THREE.Vector3();
  private chassisRotation = new THREE.Quaternion();
  private chassisTranslation = new THREE.Vector3();
  gameLoop = (delta: number) => {
    if (
      !this.raycastVehicle ||
      !this.carBodyMesh ||
      !this.tireFrontLeftMesh ||
      !this.tireFrontRightMesh ||
      !this.tireRearLeftMesh ||
      !this.tireRearRightMesh
    )
      return;

    updateKeyInput(this.raycastVehicle);
    this.raycastVehicle.update(delta);
    this.world.step();

    const chassisRigidBodyRotation =
      this.raycastVehicle.chassisRigidBody.rotation();
    const chassisRigidBodyPosition =
      this.raycastVehicle.chassisRigidBody.translation();

    this.carBodyMesh.quaternion.set(
      chassisRigidBodyRotation.x,
      chassisRigidBodyRotation.y,
      chassisRigidBodyRotation.z,
      chassisRigidBodyRotation.w
    );
    this.carBodyMesh.position.set(
      chassisRigidBodyPosition.x,
      chassisRigidBodyPosition.y,
      chassisRigidBodyPosition.z
    );

    this.tireFrontLeftMesh.quaternion.copy(
      this.raycastVehicle.wheels[0].state.worldTransform.quaternion
    );
    this.tireFrontLeftMesh.position.copy(
      this.raycastVehicle.wheels[0].state.worldTransform.position
    );
    this.tireFrontRightMesh.quaternion.copy(
      this.raycastVehicle.wheels[1].state.worldTransform.quaternion
    );
    this.tireFrontRightMesh.position.copy(
      this.raycastVehicle.wheels[1].state.worldTransform.position
    );
    this.tireRearLeftMesh.quaternion.copy(
      this.raycastVehicle.wheels[2].state.worldTransform.quaternion
    );
    this.tireRearLeftMesh.position.copy(
      this.raycastVehicle.wheels[2].state.worldTransform.position
    );
    this.tireRearRightMesh.quaternion.copy(
      this.raycastVehicle.wheels[3].state.worldTransform.quaternion
    );
    this.tireRearRightMesh.position.copy(
      this.raycastVehicle.wheels[3].state.worldTransform.position
    );

    if (this.carBodyMesh.position.y < -20) {
      this.reset();
    }

    this.updateCamera(delta);
  };
  updateCamera = (delta: number) => {
    if (!this.raycastVehicle) return;
    const chassis = this.raycastVehicle.chassisRigidBody;

    this.chassisRotation.copy(chassis.rotation() as THREE.Quaternion);
    this.chassisTranslation.copy(chassis.translation() as THREE.Vector3);

    const t = 1.0 - Math.pow(0.01, delta);

    this.cameraIdealOffset.set(-4.5, 0.8, 0);
    this.cameraIdealOffset.applyQuaternion(this.chassisRotation);
    this.cameraIdealOffset.add(this.chassisTranslation);

    if (this.cameraIdealOffset.y < 0) this.cameraIdealOffset.y = 0.5;

    this.cameraIdealLookAt.set(0, 1, 0);
    this.cameraIdealLookAt.applyQuaternion(this.chassisRotation);
    this.cameraIdealLookAt.add(this.chassisTranslation);

    this.currentCameraPosition.lerp(this.cameraIdealOffset, t);
    this.currentCameraLookAt.lerp(this.cameraIdealLookAt, t);

    this.camera.position.copy(this.currentCameraPosition);
    this.camera.lookAt(this.currentCameraLookAt);
  };
  reset = () => {
    if (!this.raycastVehicle || !this.chassisRigidBody) return;
    this.chassisRigidBody.setTranslation(new THREE.Vector3(0, 4, 0), true);
    this.chassisRigidBody.setRotation(
      new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        Math.PI / 2
      ),
      true
    );

    for (let i = 0; i < this.raycastVehicle.wheels.length; i++) {
      this.raycastVehicle.applyEngineForce(0, i);
      this.raycastVehicle.setBrakeValue(1000, i);
    }
  };
}
