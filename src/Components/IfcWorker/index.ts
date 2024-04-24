/* eslint-disable @typescript-eslint/no-explicit-any */
import * as OBC from "openbim-components";
import {
  DataConverterSignal,
  IIfcGeometries,
  IIfcProperties,
  IfcGeometriesSignal,
  IfcPropertiesSignal,
  disposeSignal,
} from "./Signal";
import {effect} from "@preact/signals-react";
import {Culling} from "../Culling";
import * as FRAG from "bim-fragment";
import {BimLoader} from "@Components/Loader/BimLoader";
import {currentModel, loading} from "@signals/ListModel";
import {SimpleCamera} from "@Components/MeshWalk/SimpleCamera";
export * from "./Signal";
const IfcGeometryWorkerPath = "./IfcGeometryWorker.js";
const IfcPropertyWorkerPath = "./IfcPropertyWorker.js";

export class IfcWorker extends OBC.Component<Worker> implements OBC.Disposable {
  static readonly uuid = "d4f0414e-459d-46d9-b31c-45210ea533f0" as const;
  enabled = false;
  private readonly _DataConverterSignal: DataConverterSignal;
  private readonly loader = new BimLoader();
  get(..._args: any): Worker {
    throw new Error("Method not implemented.");
  }
  private geometryWorker = new Worker(
    new URL(IfcGeometryWorkerPath, import.meta.url)
  );
  private propertyWorker = new Worker(
    new URL(IfcPropertyWorkerPath, import.meta.url)
  );
  /**
   *
   */
  constructor(components: OBC.Components) {
    super(components);
    this.components.tools.add(IfcWorker.uuid, this);
    this._DataConverterSignal = new DataConverterSignal();
    this.onMessage();
    effect(async () => {
      if (!loading.value) return;
      await this.onLoadModel();
    });
  }
  onDisposed!: OBC.Event<any>;

  async dispose() {
    disposeSignal();
    this.geometryWorker?.terminate();
    this.propertyWorker?.terminate();
    this.setupEvent = false;
  }
  init() {}

  private async onMessage() {
    this.geometryWorker.onmessage = async (e: any) => {
      const {items, coordinationMatrix, error} = e.data;
      if (error) return;
      IfcGeometriesSignal.value = {items, coordinationMatrix} as IIfcGeometries;
    };
    this.propertyWorker.onmessage = async (e: any) => {
      const {error, categories, uuid, ifcMetadata, properties, itemsByFloor} =
        e.data;
      if (error) return;
      IfcPropertiesSignal.value = {
        categories,
        uuid,
        ifcMetadata,
        properties,
        itemsByFloor,
      } as IIfcProperties;
    };
    effect(async () => {
      if (!IfcGeometriesSignal.value || !IfcPropertiesSignal.value) return;
      const model = await this._DataConverterSignal.generate(
        IfcGeometriesSignal.value,
        IfcPropertiesSignal.value
      );
      const scene = this.components.scene.get();
      const camera = this.components.camera as SimpleCamera;
      camera.addGraphModel(model.boundingBox);
      scene.add(model);
      await this.updateCuller(model);
      await this.updateFragment(model);
      this._DataConverterSignal.cleanUp();
      IfcGeometriesSignal.value = null;
      IfcPropertiesSignal.value = null;
    });
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
      } else {
        url = `./${currentModel.value}.ifc`;
      }
      this.loader.loadFile(url, (buffer: Uint8Array) => {
        this.geometryWorker.postMessage(buffer);
        this.propertyWorker.postMessage(buffer);
      });
    } catch (err) {
      console.error("Error selecting file:", err);
    }
  }
  private async updateFragment(model: FRAG.FragmentsGroup) {
    const fragments = await this.components.tools.get(OBC.FragmentManager);
    const highlighter = await this.components.tools.get(
      OBC.FragmentHighlighter
    );
    if (!fragments) return;
    for (const fragment of model.items) {
      fragment.group = model;
      fragments.list[fragment.id] = fragment;
      this.components.meshes.push(fragment.mesh);
    }
    fragments.groups.push(model);
    if (highlighter) highlighter.update();
  }

  private async updateCuller(model: FRAG.FragmentsGroup) {
    const culling = this.components.tools.get(Culling);
    if (!culling) return;
    culling.addModel(model);
    this.setupEvent = true;
  }
  set setupEvent(enabled: boolean) {
    const controls = (this.components.camera as OBC.SimpleCamera).controls;
    const domElement = (
      this.components.renderer as OBC.PostproductionRenderer
    ).get().domElement;
    if (!controls) return;
    if (enabled) {
      controls.addEventListener("control", this.updateCulling);
      controls.addEventListener("controlstart", this.updateCulling);
      controls.addEventListener("wake", this.updateCulling);
      controls.addEventListener("controlend", this.updateCulling);
      controls.addEventListener("sleep", this.updateCulling);
      domElement.addEventListener("wheel", this.updateCulling);
    } else {
      controls.removeEventListener("control", this.updateCulling);
      controls.removeEventListener("controlstart", this.updateCulling);
      controls.removeEventListener("wake", this.updateCulling);
      controls.removeEventListener("controlend", this.updateCulling);
      controls.removeEventListener("sleep", this.updateCulling);
      domElement.removeEventListener("wheel", this.updateCulling);
    }
  }
  updateCulling = async () => {
    const culling = await this.components.tools.get(Culling);
    if (!culling) return;
    culling.needsUpdate = true;
  };
}
OBC.ToolComponent.libraryUUIDs.add(IfcWorker.uuid);
