// @ts-check

import vercelStatic from "@astrojs/vercel/static";
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  adapter: vercelStatic({
    webAnalytics: {
      enabled: true,
    },
  }),
});
