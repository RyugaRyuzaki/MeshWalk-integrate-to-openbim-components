import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";

export const convertToRigidBody = (mesh: THREE.Mesh, world: RAPIER.World) => {
  const colliders: RAPIER.Collider[] = [];

  mesh.updateWorldMatrix(true, true);
  mesh.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;

    // const geometry = object.geometry.clone();
    const geometry = object.geometry;

    geometry.applyMatrix4(object.matrix);
    geometry.computeVertexNormals();
    if (!geometry.attributes.position || !geometry.index) return;
    const vertices = new Float32Array(geometry.attributes.position.array);
    const indices = new Uint32Array(geometry.index.array);

    const groundColliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices)
      .setFriction(1)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    const groundRigidBodyDesc = RAPIER.RigidBodyDesc.fixed();
    const groundRigidBody = world.createRigidBody(groundRigidBodyDesc);

    const groundCollider = world.createCollider(
      groundColliderDesc,
      groundRigidBody
    );
    colliders.push(groundCollider);
  });

  return colliders;
};
