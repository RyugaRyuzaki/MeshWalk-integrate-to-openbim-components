import {fileProgressSignal} from "@signals/notify";
import * as THREE from "three";
export class BimLoader extends THREE.Loader {
  private loader!: THREE.FileLoader;
  private onProgress = (event: ProgressEvent) => {
    fileProgressSignal.value = event.loaded / event.total;
  };
  private onError = (err: ErrorEvent | unknown) => {
    console.log(err);
  };
  constructor(manager?: THREE.LoadingManager) {
    super(manager);
    this.init();
  }
  private init() {
    this.loader = new THREE.FileLoader(this.manager);
    this.loader.setPath(this.path);
    this.loader.setResponseType("arraybuffer");
    this.loader.setRequestHeader(this.requestHeader);
    this.loader.setWithCredentials(this.withCredentials);
  }
  loadFile(url: string, onSuccess: (buffer: Uint8Array) => void) {
    this.loader.load(
      url,
      (buffer: ArrayBuffer | string) => {
        try {
          if (typeof buffer == "string") {
            throw new Error("IFC files must be given as a buffer!");
          }
          onSuccess(new Uint8Array(buffer));
        } catch (e: any) {
          this.onError(e);
          this.manager.itemError(url);
        }
        URL.revokeObjectURL(url);
      },
      this.onProgress,
      this.onError
    );
  }
}
