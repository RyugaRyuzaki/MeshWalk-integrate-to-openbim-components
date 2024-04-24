import * as THREE from "three";
import * as WEBIFC from "web-ifc";
import * as OBC from "openbim-components";
import {mergeBufferGeometries} from "three-stdlib";
import {BimLoader} from "./BimLoader";
import {effect} from "@preact/signals-react";
import {currentModel, loading, storageModels} from "@signals/ListModel";
import {IInstancedMesh, Model} from "./Model";
export interface IBufferGeometry {
  vertexData: Float32Array;
  indexData: Uint32Array;
  matrix: number[];
  expressID: number;
}
export interface IfcGeometries {
  [colID: string]: {
    color: WEBIFC.Color;
    buffers: IBufferGeometry[];
  };
}
export class Loader implements OBC.Disposable {
  enabled = false;
  private worker = new Worker(new URL("./LoaderWorker.js", import.meta.url));
  private materials: Map<string, THREE.MeshLambertMaterial> = new Map();
  models: Map<string, Model> = new Map();
  modelName = "";
  private readonly loader = new BimLoader();

  /** {@link Disposable.onDisposed} */
  readonly onDisposed = new OBC.Event<string>();
  // Alternative scene and meshes to make the visibility check
  constructor() {
    this.onMessage();
  }
  /** {@link Disposable.dispose} */
  async dispose() {
    this.enabled = false;
    this.worker.terminate();
    this.materials.clear();
    for (const [_, model] of this.models) {
      model.dispose();
    }
    this.models.clear();
    await this.onDisposed.trigger();
    this.onDisposed.reset();
  }

  private onMessage() {
    this.worker.addEventListener("message", async (e: any) => {
      if (e.data.error) return;
      const items = e.data.items as IfcGeometries;
      const meshes: {[colID: string]: IInstancedMesh} = {};
      for (const colID in items) {
        const {color, buffers} = items[colID];
        const material = this.getMaterial(colID, color);
        const geometry = this.getGeometry(buffers);
        geometry.computeBoundingBox();
        this.interleavedCombineGeometry(geometry);
        if (!meshes[colID])
          meshes[colID] = {geometry, material} as IInstancedMesh;
      }
      const model = new Model(meshes, this.modelName);
      model.setMatrix(
        -0.45,
        new THREE.Vector3(10, 0, -10),
        new THREE.Vector3(10, 0, -1000),
        "front"
      );
      model.setMatrix(
        -0.45,
        new THREE.Vector3(-10, 0, 1000),
        new THREE.Vector3(-10, 0, 10),
        "back"
      );

      this.models.set(this.modelName, model);
      this.materials.clear();
      storageModels.value = [...storageModels.value, this.modelName];
      loading.value = false;
    });
  }
  private getMaterial(
    colID: string,
    color: WEBIFC.Color
  ): THREE.MeshLambertMaterial {
    const newMaterial = this.materials.get(colID);
    if (newMaterial) return newMaterial;

    const {x, y, z, w} = color;

    const transparent = w !== 1;
    const opacity = transparent ? 0.4 : 1;
    const material = new THREE.MeshLambertMaterial({transparent, opacity});

    // This prevents z-fighting for ifc spaces
    if (opacity !== 1) {
      material.depthWrite = false;
      material.polygonOffset = true;
      material.polygonOffsetFactor = 5;
      material.polygonOffsetUnits = 1;
    }
    material.color = new THREE.Color().setRGB(x, y, z, "srgb");
    material.shadowSide = THREE.DoubleSide;
    this.materials.set(colID, material);
    return material;
  }
  private getGeometry(buffers: IBufferGeometry[]) {
    const geometries: THREE.BufferGeometry[] = [];
    for (const buffer of buffers) {
      const {vertexData, indexData, matrix} = buffer;
      const geometry = this.constructBuffer(vertexData, indexData);
      geometry.applyMatrix4(new THREE.Matrix4().fromArray(matrix));
      geometries.push(geometry);
    }
    const combine = mergeBufferGeometries(geometries, true);
    geometries.forEach((geo: THREE.BufferGeometry) => geo.dispose());
    if (!combine || combine.groups.length === 0)
      throw new Error("Something went wrong");
    combine.groups.forEach((item: any) => (item.materialIndex = 0));
    return combine;
  }
  private constructBuffer(
    vertexData: Float32Array,
    indexData: Uint32Array
  ): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();

    const posFloats = new Float32Array(vertexData.length / 2);
    const normFloats = new Float32Array(vertexData.length / 2);

    for (let i = 0; i < vertexData.length; i += 6) {
      posFloats[i / 2] = vertexData[i];
      posFloats[i / 2 + 1] = vertexData[i + 1];
      posFloats[i / 2 + 2] = vertexData[i + 2];

      normFloats[i / 2] = vertexData[i + 3];
      normFloats[i / 2 + 1] = vertexData[i + 4];
      normFloats[i / 2 + 2] = vertexData[i + 5];
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(posFloats, 3));
    geometry.setAttribute("normal", new THREE.BufferAttribute(normFloats, 3));
    geometry.setIndex(new THREE.BufferAttribute(indexData, 1));

    return geometry;
  }
  private interleavedCombineGeometry(geometry: THREE.BufferGeometry) {
    const position = geometry.attributes.position;
    const normal = geometry.attributes.normal;

    const interleavedData = new Float32Array(
      position.array.length + normal.array.length
    );

    // Sao chép dữ liệu vị trí và normal vào interleavedData
    for (let i = 0; i < position.count; i++) {
      const positionIndex = i * 3;
      const normalIndex = i * 3;

      // Sao chép dữ liệu vị trí
      interleavedData[i * 6] = position.array[positionIndex];
      interleavedData[i * 6 + 1] = position.array[positionIndex + 1];
      interleavedData[i * 6 + 2] = position.array[positionIndex + 2];

      // Sao chép dữ liệu normal
      interleavedData[i * 6 + 3] = normal.array[normalIndex];
      interleavedData[i * 6 + 4] = normal.array[normalIndex + 1];
      interleavedData[i * 6 + 5] = normal.array[normalIndex + 2];
    }

    const interleavedBuffer = new THREE.InterleavedBuffer(interleavedData, 6); // Tổng số thành phần của mỗi vertex là 6 (3 cho position và 3 cho normal)
    geometry.deleteAttribute("position");
    geometry.deleteAttribute("normal");

    // Thiết lập thuộc tính vị trí (position) từ InterleavedBuffer
    geometry.setAttribute(
      "position",
      new THREE.InterleavedBufferAttribute(interleavedBuffer, 3, 0)
    ); // 3 là số thành phần mỗi vertex (x, y, z)

    // Nếu cần, bạn có thể thiết lập thuộc tính normal tương tự như sau:
    geometry.setAttribute(
      "normal",
      new THREE.InterleavedBufferAttribute(interleavedBuffer, 3, 3)
    ); // Offset ở vị trí thứ 3, vì position đã chiếm 3 thành phần Float32
  }
  checkModel(modelName: string): boolean {
    return this.models.has(modelName);
  }
  async onLoadModel() {
    try {
      const isLocal = currentModel.value === "Open Local";
      let url = "";
      if (isLocal) {
        const options: OpenFilePickerOptions = {
          multiple: false,
          types: [
            {
              description: "Files",
              accept: {
                "application/octet-stream": [".ifc"],
              },
            },
          ],
        };

        const [fileHandle] = await window.showOpenFilePicker(options);
        const file = await fileHandle.getFile();
        url = URL.createObjectURL(file);
        this.modelName = file.name.split(".ifc")[0];
      } else {
        url = `./${currentModel.value}.ifc`;
        this.modelName = currentModel.value;
      }
      this.loader.loadFile(url, (buffer: Uint8Array) => {
        this.worker.postMessage({action: "onLoadModel", payload: buffer});
      });
    } catch (err) {
      console.error("Error selecting file:", err);
    }
  }
}
export const ifcLoader = new Loader();
