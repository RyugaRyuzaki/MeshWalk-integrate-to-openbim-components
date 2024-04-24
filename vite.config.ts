import {defineConfig, loadEnv} from "vite";
import react from "@vitejs/plugin-react";
import glsl from "vite-plugin-glsl";
import path from "path";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
// https://vitejs.dev/config/
//@ts-ignore
export default defineConfig(() => {
  const env = loadEnv("development", process.cwd(), "");
  return {
    plugins: [
      wasm(),
      topLevelAwait(),
      react(),
      glsl({
        include: [
          // Glob pattern, or array of glob patterns to import
          "**/*.glsl",
          "**/*.wgsl",
          "**/*.vert",
          "**/*.frag",
          "**/*.vs",
          "**/*.fs",
        ],
        exclude: undefined, // Glob pattern, or array of glob patterns to ignore
        warnDuplicatedImports: true, // Warn if the same chunk was imported multiple times
        defaultExtension: "glsl", // Shader suffix when no extension is specified
        compress: false, // Compress output shader code

        watch: true, // Recompile shader on change
        root: "/", // Directory for root imports
      }),
    ],
    server: {
      port: env.PORT, // set port
    },
    esbuild: {
      jsxFactory: "React.createElement",
      jsxFragment: "React.Fragment",
    },
    resolve: {
      alias: {
        "@assets": path.resolve(__dirname, "./src/assets"),
        "@BimModel": path.resolve(__dirname, "./src/BimModel"),
        "@Components": path.resolve(__dirname, "./src/Components"),
        "@signals": path.resolve(__dirname, "./src/signals"),
        "@pages": path.resolve(__dirname, "./src/pages"),
      },
    },
  };
});
