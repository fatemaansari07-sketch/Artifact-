// Turns the flat { "/App.js": "...", "/components/Foo.js": "..." } shape
// (what the generator produces for Sandpack) into an actual buildable
// Vite + React project structure that Vercel can build and serve.

function toVercelFileList(fileMap) {
  return Object.entries(fileMap).map(([path, data]) => ({
    file: path.replace(/^\//, ""),
    data,
  }));
}

export function wrapBrowserProject(files, dependencies = {}) {
  const src = {};
  for (const [path, content] of Object.entries(files)) {
    // "/App.js" -> "src/App.js", "/components/Foo.js" -> "src/components/Foo.js"
    src[`src${path}`] = content;
  }

  const hasStyles = Object.keys(files).some((p) => p.toLowerCase() === "/styles.css");

  const pkg = {
    name: "forge-app",
    private: true,
    version: "0.0.0",
    type: "module",
    scripts: {
      dev: "vite",
      build: "vite build",
      preview: "vite preview",
    },
    dependencies: {
      react: "^18.3.1",
      "react-dom": "^18.3.1",
      ...dependencies,
    },
    devDependencies: {
      "@vitejs/plugin-react": "^4.3.1",
      vite: "^5.4.0",
    },
  };

  const viteConfig = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  esbuild: { loader: "jsx", include: /src\\/.*\\.js$/ },
  optimizeDeps: { esbuildOptions: { loader: { ".js": "jsx" } } },
});
`;

  const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Forge App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`;

  const mainJsx = `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.js";
${hasStyles ? 'import "./styles.css";\n' : ""}
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;

  const fullProject = {
    "package.json": JSON.stringify(pkg, null, 2),
    "vite.config.js": viteConfig,
    "index.html": indexHtml,
    "src/main.jsx": mainJsx,
    ...src,
  };

  return toVercelFileList(fullProject);
}
