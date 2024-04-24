import {useControls, button} from "leva";
import {canLoad, currentModel, listModels, loading} from "@signals/ListModel";
import {ifcLoader} from "@Components/Loader";

const Models = () => {
  useControls(
    () => ({
      Models: {
        options: listModels,
        onChange: (name: string) => {
          currentModel.value = name;
        },
      },
      Load: button(
        async () => {
          loading.value = true;
          if (ifcLoader.checkModel(currentModel.value)) return;
          await ifcLoader.onLoadModel();
        },

        {disabled: canLoad.value}
      ),
    }),
    [canLoad.value]
  );
  return null;
};
export default Models;
