import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const shimPath = path.join(__dirname, "node-shim.js").replace(/\\/g, "/");

class NodeProtocolPlugin {
  apply(compiler) {
    compiler.hooks.normalModuleFactory.tap("NodeProtocolPlugin", (factory) => {
      factory.hooks.beforeResolve.tap("NodeProtocolPlugin", (data) => {
        if (data && data.request && data.request.startsWith("node:")) {
          data.request = shimPath;
        }
      });
    });
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: "/data_manipulation_tool",
  trailingSlash: true,
  images: { unoptimized: true },
  serverExternalPackages: ["pptxgenjs"],
  typescript: { ignoreBuildErrors: true },
  webpack: (config) => {
    config.plugins.push(new NodeProtocolPlugin());
    return config;
  },
};
export default nextConfig;
