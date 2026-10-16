import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";

// TanStack Start (SSR) app. The production build targets Cloudflare Workers.
export default defineConfig(({ command }) => ({
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      // src/server.ts wraps the server entry to render a friendly error page.
      server: { entry: "server" },
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
    }),
    ...(command === "build"
      ? [nitro({ preset: "cloudflare-module", cloudflare: { nodeCompat: true, deployConfig: true, wrangler: { name: "electrosoft-crm" } } })]
      : []),
    viteReact(),
  ],
  css: { transformer: "lightningcss" },
  build: {
    rolldownOptions: {
      output: {
        // Heavy libraries get their own files, so only the pages that use them download them.
        // Without this they land in the shared chunk every page (and the phone app) loads first.
        codeSplitting: {
          includeDependenciesRecursively: false,
          groups: [
            { name: "gsap", test: /node_modules[\\/]gsap/ },
            { name: "motion", test: /node_modules[\\/](framer-motion|motion-dom|motion-utils)/ },
            { name: "charts", test: /node_modules[\\/](recharts|d3-|lodash|react-smooth|decimal\.js-light|victory-vendor)/ },
          ],
        },
      },
    },
  },
  resolve: {
    alias: { "@": `${process.cwd()}/src` },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  server: { host: "::", port: 8080 },
}));
