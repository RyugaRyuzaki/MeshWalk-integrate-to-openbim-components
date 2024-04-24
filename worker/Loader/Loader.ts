import * as WEBIFC from "web-ifc";

import {IfcParser} from "../IfcParser";
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
export class Loader extends IfcParser {
  items: IfcGeometries = {};
  onUpdateModel!: () => void;
  /**
   *
   */
  constructor(
    private onSuccess: (modelID: number, items: IfcGeometries) => void,
    private onError: (error: any) => void
  ) {
    super();
  }
  async readIfcFile(data: Uint8Array) {
    try {
      const {path, absolute} = this.wasm;
      this._webIfc.SetWasmPath(path, absolute);
      await this._webIfc.Init();
      this._webIfc.OpenModel(data, this.webIfc);
      await this.readAllGeometries(0);
      this.onSuccess(0, this.items);
      if (this.onUpdateModel) this.onUpdateModel();
    } catch (error: any) {
      this.onError(error);
    }
  }
  private async readAllGeometries(modelID: number) {
    // Some categories (like IfcSpace) need to be created explicitly
    const optionals = this.optionalCategories;

    // Force IFC space to be transparent
    if (optionals.includes(WEBIFC.IFCSPACE)) {
      const index = optionals.indexOf(WEBIFC.IFCSPACE);
      optionals.splice(index, 1);
      this._webIfc.StreamAllMeshesWithTypes(
        modelID,
        [WEBIFC.IFCSPACE],
        (mesh) => {
          this.streamMesh(mesh, true);
        }
      );
    }

    // Load rest of optional categories (if any)
    if (optionals.length) {
      this._webIfc.StreamAllMeshesWithTypes(modelID, optionals, (mesh) => {
        this.streamMesh(mesh);
      });
    }

    // Load common categories
    this._webIfc.StreamAllMeshes(modelID, (mesh: WEBIFC.FlatMesh) => {
      this.streamMesh(mesh);
    });
  }
  streamMesh(mesh: WEBIFC.FlatMesh, forceTransparent = false) {
    const size = mesh.geometries.size();
    for (let i = 0; i < size; i++) {
      const {expressID} = mesh;
      const geometry = mesh.geometries.get(i);
      const geometryID = geometry.geometryExpressID;
      const {color, flatTransformation} = geometry;
      if (forceTransparent) geometry.color.w = 0.1;
      const {x, y, z, w} = color;

      const buffer = this.newBufferGeometry(geometryID);
      if (!buffer) continue;
      const {vertexData, indexData} = buffer;
      const colID = `${x}-${y}-${z}-${w}`;
      if (!this.items[colID]) this.items[colID] = {color, buffers: []};
      this.items[colID].buffers.push({
        vertexData,
        indexData,
        matrix: flatTransformation,
        expressID,
      });
    }
  }
  private newBufferGeometry(geometryID: number): IBufferGeometry | null {
    const geometry = this._webIfc.GetGeometry(0, geometryID);
    const vertexData = this.getVertices(geometry);
    if (!vertexData.length) return null;
    const indexData = this.getIndices(geometry);
    if (!indexData.length) return null;
    // @ts-ignore
    geometry.delete();
    return {vertexData, indexData} as IBufferGeometry;
  }

  private getIndices(geometryData: WEBIFC.IfcGeometry) {
    const indices = this._webIfc.GetIndexArray(
      geometryData.GetIndexData(),
      geometryData.GetIndexDataSize()
    ) as Uint32Array;
    return indices;
  }

  private getVertices(geometryData: WEBIFC.IfcGeometry) {
    const verts = this._webIfc.GetVertexArray(
      geometryData.GetVertexData(),
      geometryData.GetVertexDataSize()
    ) as Float32Array;
    return verts;
  }
}
