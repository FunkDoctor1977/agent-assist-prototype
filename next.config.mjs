/** @type {import('next').NextConfig} */
const nextConfig = {
  // @xenova/transformers ships an ONNX runtime that Next.js' default webpack
  // config doesn't know how to bundle. Mark it (and its deps) as external so
  // they're loaded at runtime instead of bundled, and ship the model files
  // verbatim.
  serverExternalPackages: ["@xenova/transformers", "sharp", "onnxruntime-node", "pdf-parse"],
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      sharp$: false,
      "onnxruntime-node$": false,
    };
    return config;
  },
};
export default nextConfig;
