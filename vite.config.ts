import { defineConfig, loadEnv, type Plugin } from "vite";
import solid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";
import { networkInterfaces } from "os";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function qrcodePlugin(): Plugin {
  return {
    name: "qrcode",
    apply: "serve",
    configureServer(server) {
      // Print QR code after Vite prints its own URLs
      const origPrintUrls = server.printUrls.bind(server);
      server.printUrls = () => {
        origPrintUrls();

        const lanIp = Object.values(networkInterfaces())
          .flat()
          .find((i) => i && i.family === "IPv4" && !i.internal)?.address;

        if (lanIp) {
          const addr = server.httpServer?.address();
          const port = addr && typeof addr !== "string" ? addr.port : 5173;
          const network = `http://${lanIp}:${port}`;

          import("qrcode-terminal").then((mod) => {
            const qr = mod.default ?? mod;
            console.log("\n  Scan to open on your phone:\n");
            qr.generate(network, { small: true });
            console.log();
          });
        }
      };
    },
  };
}

function gameKitEnvPlugin(): Plugin {
  let envVars: Record<string, string>;

  return {
    name: "game-kit-env",
    enforce: "pre",
    configResolved(config) {
      envVars = loadEnv(config.mode, config.root, "VITE_");
    },
    transform(code, id) {
      if (!id.includes("game-kit")) return;
      const key = envVars.VITE_POSTHOG_API_KEY ?? "";
      return code.replace(
        /import\.meta\.env\.VITE_POSTHOG_API_KEY/g,
        JSON.stringify(key),
      );
    },
  };
}

export default defineConfig({
  plugins: [solid(), tailwindcss(), qrcodePlugin(), gameKitEnvPlugin()],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "src"),
    },
  },
  optimizeDeps: {
    exclude: ["@wolfgames/components"],
    include: ["howler", "eventemitter3", "parse-svg-path", "@xmldom/xmldom"],
  },
  define: {
    "process.env": {},
  },
  server: {
    host: true,
  },
  build: {
    // Top-level await (e.g. game analytics init) requires ES2022+
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/gsap/")) return "gsap";
          if (id.includes("node_modules/howler/")) return "audio";
          if (id.includes("node_modules/earcut/")) return "vendor";
          if (id.includes("node_modules/eventemitter3/")) return "vendor";
          if (id.includes("node_modules/tiny-lru/")) return "vendor";
          if (id.includes("node_modules/parse-svg-path/")) return "vendor";
          if (id.includes("node_modules/@pixi/colord/")) return "vendor";
        },
      },
    },
  },
});
