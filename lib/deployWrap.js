// Turns the flat { "/App.js": "...", "/components/Foo.js": "..." } shape
// (what the generator produces for Sandpack) into an actual buildable
// Vite + React project structure that Vercel can build and serve.

function toVercelFileList(fileMap) {
  return Object.entries(fileMap).map(([path, data]) => ({
    file: path.replace(/^\//, ""),
    data,
  }));
}

export function buildViteProjectFiles(files, dependencies = {}) {
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

  const readme = `# Forge App

Ye project Forge se generate hua hai (Vite + React).

## Local run
\`\`\`
npm install
npm run dev
\`\`\`

## Kisi bhi AI tool mein continue karne ke liye
Is poore folder ko paste kar do apni pasand ke AI coding tool mein
(ChatGPT, Claude, ya koi bhi) aur bolo: "Ye ek React + Vite project hai,
isko aage ye ye add karo: ..." — ye poori tarah standard Vite setup hai,
kahin bhi seedha \`npm install && npm run dev\` se chal jayega.

## Deploy
Vercel/Netlify pe seedha is folder ko import kar sakte ho — framework
"Vite" auto-detect ho jayega.
`;

  return {
    "package.json": JSON.stringify(pkg, null, 2),
    "vite.config.js": viteConfig,
    "index.html": indexHtml,
    "src/main.jsx": mainJsx,
    "README.md": readme,
    ...src,
  };
}

export function wrapBrowserProject(files, dependencies = {}) {
  return toVercelFileList(buildViteProjectFiles(files, dependencies));
}
