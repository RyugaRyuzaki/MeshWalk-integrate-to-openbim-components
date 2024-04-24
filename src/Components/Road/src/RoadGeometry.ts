import * as THREE from "three";
import {MeshBVH} from "three-mesh-bvh";
const radialSegments = 2;
const ribbonSegments = 128;

// helper variables
let P = new THREE.Vector3();
const normal = new THREE.Vector3();
const binormal = new THREE.Vector3();
const tangent = new THREE.Vector3();
const vertex = new THREE.Vector3();
const uv = new THREE.Vector2();

export class RoadGeometry extends THREE.BufferGeometry {
  tangents: THREE.Vector3[];
  normals: THREE.Vector3[];
  binormals: THREE.Vector3[];
  type = "RoadGeometry";
  boundsTree!: MeshBVH;
  constructor(
    path: THREE.CurvePath<THREE.Vector3>,
    segments = ribbonSegments,
    ribbonWidth = 10,
    corner = true
  ) {
    super();

    const ribbonWidthHalf = ribbonWidth / 2;
    const frames = path.computeFrenetFrames(segments, false);
    // expose internals
    this.tangents = frames.tangents;
    this.normals = frames.normals;
    this.binormals = frames.binormals;
    // buffer
    const vertices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    // create buffer data

    generateBufferData();

    // build geometry

    this.setIndex(indices);
    this.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    this.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    this.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    // functions
    this.computeBoundingBox();
    this.boundsTree = new MeshBVH(this);
    function generateBufferData() {
      for (let i = 0; i <= segments; i++) {
        generateSegment(i);
      }
      generateUVs();
      generateIndices();
    }
    function generateSegment(i: number) {
      const width =
        i < 1 || i === segments ? ribbonWidthHalf * 1.1 : ribbonWidthHalf;
      const activeWidth = corner ? width : ribbonWidthHalf;
      // we use getPointAt to sample evenly distributed points from the given path
      const progressAlongThePath = i / segments;
      P = path.getPointAt(progressAlongThePath, P);
      // retrieve corresponding normal and binormal

      normal.copy(frames.normals[i]); //.applyQuaternion( faceRotation );
      binormal.copy(frames.binormals[i]); //.applyQuaternion( faceRotation );
      tangent.copy(frames.tangents[i]);

      // generate normals and vertices for the current segment

      for (let j = 0; j <= radialSegments; j++) {
        // normal
        normals.push(-normal.x, -normal.y, -normal.z);

        // vertex
        const v = (j / radialSegments) * Math.PI * 2;
        const sin = Math.sin(v);
        const cos = -Math.cos(v);

        vertex.x = P.x + activeWidth * (sin * normal.x + cos * binormal.x);
        vertex.y = P.y + activeWidth * (sin * normal.y + cos * binormal.y);
        vertex.z = P.z + activeWidth * (sin * normal.z + cos * binormal.z);

        vertices.push(vertex.x, vertex.y, vertex.z);
      }
    }

    function generateIndices() {
      for (let j = 1; j <= segments; j++) {
        for (let i = 1; i <= radialSegments - 1; i++) {
          const a = (radialSegments + 1) * (j - 1) + (i - 1);
          const b = (radialSegments + 1) * j + (i - 1);
          const c = (radialSegments + 1) * j + i;
          const d = (radialSegments + 1) * (j - 1) + i;

          // faces

          indices.push(a, b, d);
          indices.push(b, c, d);
        }
      }
    }

    function generateUVs() {
      for (let i = 0; i <= segments; i++) {
        for (let j = 0; j <= radialSegments; j++) {
          uv.x = 1 - j / (radialSegments - 1);
          uv.y = i / segments;

          uvs.push(uv.x, uv.y);
        }
      }
    }
  }
  dispose(): void {
    super.dispose();
    this.disposeBoundsTree();
  }
}
