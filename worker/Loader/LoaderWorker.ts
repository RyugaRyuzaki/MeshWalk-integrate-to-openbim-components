import {IfcGeometries, Loader} from "./Loader";

let modelID = -1;
const onSuccess = (model: number, items: IfcGeometries) => {
  modelID = model;
  self.postMessage({items});
};
const onError = (error: any) => {
  modelID = -1;
  self.postMessage({error});
};
const loader: Loader = new Loader(onSuccess, onError);
loader.onUpdateModel = () => {};

const handleLoadModel = async (buffer: Uint8Array) => {
  if (!loader) return;
  await loader.readIfcFile(buffer);
};
const handleUpdateModel = ({model, ids}: {model: number; ids: number[]}) => {
  if (modelID === -1 || !loader || model !== modelID) return;
  console.log(ids);
};
const handlerMap = {
  onLoadModel: handleLoadModel,
  onUpdateModel: handleUpdateModel,
};

self.onmessage = ({data}) => {
  const {action, payload} = data;
  const handler = handlerMap[action as keyof typeof handlerMap];
  if (handler) handler(payload);
};
