import * as OBC from "openbim-components";
import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import {GLTFLoader} from "three-stdlib";

export class Ground implements OBC.Disposable {
  readonly onDisposed = new OBC.Event<string>();
  private groundColorMap!: THREE.Texture;
  private groundNormalMap!: THREE.Texture;
  private loader = new THREE.TextureLoader();
  private groundMesh!: THREE.Mesh;
  private geometry!: THREE.BoxGeometry;
  private material!: THREE.MeshStandardMaterial;
  private barricadeList: {mesh: THREE.Group; body: RAPIER.RigidBody}[] = [];
  get mesh() {
    return this.groundMesh;
  }
  private barricadeInitialPositions = [
    [-2, 0.4, -8],
    [0, 0.4, -8],
    [2, 0.4, -8],
  ];
  /**
   *
   */
  constructor(private world: RAPIER.World, private scene: THREE.Scene) {
    this.groundColorMap = this.loader.load("./ground-color.webp");
    this.groundNormalMap = this.loader.load("./ground-normal.webp");

    this.groundColorMap.repeat.set(10, 5);
    this.groundColorMap.wrapS = this.groundColorMap.wrapT =
      THREE.RepeatWrapping;
    this.groundColorMap.colorSpace = THREE.SRGBColorSpace;
    this.groundNormalMap.repeat.copy(this.groundColorMap.repeat);
    this.groundNormalMap.wrapS = this.groundNormalMap.wrapT =
      this.groundColorMap.wrapT;
    this.groundNormalMap.colorSpace = THREE.SRGBColorSpace;
    const size = 40;
    const depth = 0.01;
    this.geometry = new THREE.BoxGeometry(size, depth, size / 2);
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
    const groundRigidBodyDesc = RAPIER.RigidBodyDesc.fixed();
    const groundRigidBody = this.world.createRigidBody(groundRigidBodyDesc);
    const groundColliderDesc = RAPIER.ColliderDesc.cuboid(
      this.geometry.parameters.width / 2,
      this.geometry.parameters.height / 2,
      this.geometry.parameters.depth / 2
    );
    groundColliderDesc.setTranslation(
      this.groundMesh.position.x,
      this.groundMesh.position.y,
      this.groundMesh.position.z
    );
    groundColliderDesc.setRotation(
      new RAPIER.Quaternion(
        this.groundMesh.quaternion.x,
        this.groundMesh.quaternion.y,
        this.groundMesh.quaternion.z,
        this.groundMesh.quaternion.w
      )
    );
    this.world.createCollider(groundColliderDesc, groundRigidBody);
    this.scene.add(this.groundMesh);
    (async () => {
      const barricadeMesh = (await new GLTFLoader().loadAsync("/barricade.glb"))
        .scene;
      this.barricadeInitialPositions.forEach((position: number[]) => {
        const mesh = barricadeMesh.clone();
        this.scene.add(mesh);

        const barricadeRigidBodyDesc = RAPIER.RigidBodyDesc.dynamic();
        barricadeRigidBodyDesc.setTranslation(
          position[0],
          position[1],
          position[2]
        );
        const barricadeRigidBody = this.world.createRigidBody(
          barricadeRigidBodyDesc
        );
        const barricadeColliderDesc = RAPIER.ColliderDesc.cuboid(
          1.2 / 2,
          0.8 / 2,
          0.3 / 2
        ).setMass(3);
        barricadeColliderDesc.setTranslation(
          barricadeMesh.position.x,
          barricadeMesh.position.y,
          barricadeMesh.position.z
        );
        barricadeColliderDesc.setRotation(
          new RAPIER.Quaternion(
            barricadeMesh.quaternion.x,
            barricadeMesh.quaternion.y,
            barricadeMesh.quaternion.z,
            barricadeMesh.quaternion.w
          )
        );
        this.world.createCollider(barricadeColliderDesc, barricadeRigidBody);
        this.barricadeList.push({mesh, body: barricadeRigidBody});
      });
    })();
    const ambientLight = new THREE.AmbientLight();
    ambientLight.intensity = 0.5;
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight();
    directionalLight.position.set(100, 100, 100);
    directionalLight.intensity = 0.5;
    directionalLight.target.position.set(-5, 0, 0);
    directionalLight.castShadow = true;
    directionalLight.shadow.bias = -0.001;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 1000.0;
    directionalLight.shadow.camera.left = 10;
    directionalLight.shadow.camera.right = -10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    this.scene.add(directionalLight);
    this.scene.add(directionalLight.target);
  }
  async dispose() {
    this.groundColorMap?.dispose();
    this.groundNormalMap?.dispose();
    this.geometry?.dispose();
    this.material?.dispose();
    this.groundMesh?.removeFromParent();
    (this.groundMesh as any) = null;
    for (const {mesh} of this.barricadeList) {
      console.log(mesh);
    }
    await this.onDisposed.trigger();
    this.onDisposed.reset();
  }
  gameLoop = () => {
    this.barricadeList.forEach(
      ({mesh: barricadeMesh, body: barricadeRigidBody}) => {
        barricadeMesh.position.copy(
          barricadeRigidBody.translation() as THREE.Vector3
        );
        barricadeMesh.quaternion.copy(
          barricadeRigidBody.rotation() as THREE.Quaternion
        );
      }
    );
  };
}
