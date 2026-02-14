import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  clean: true,
  sourcemap: true,
  minify: true,
  treeshake: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
});
