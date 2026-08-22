// Keep imports small enough to fit in a model prompt: skip binaries/build
// output, cap total files and total bytes.

const TEXT_EXTENSIONS = new Set([
  ".js", ".jsx", ".ts", ".tsx", ".json", ".css", ".scss", ".html",
  ".md", ".mjs", ".cjs", ".env.example", ".yml", ".yaml", ".py",
]);

const SKIP_DIR_PARTS = new Set([
  "node_modules", ".git", ".next", "dist", "build", ".vercel",
  "coverage", ".turbo", "__pycache__", ".venv",
]);

const MAX_FILES = 60;
const MAX_TOTAL_BYTES = 250_000;
const MAX_FILE_BYTES = 40_000;

export function shouldSkipPath(path) {
  const parts = path.split("/");
  if (parts.some((p) => SKIP_DIR_PARTS.has(p))) return true;
  const ext = "." + path.split(".").pop();
  return !TEXT_EXTENSIONS.has(ext);
}

// Applies the file-count / size caps in one place so both importers behave the same way.
export function capFiles(entries) {
  // entries: [{ path, content }]
  const capped = {};
  let total = 0;
  let count = 0;
  for (const { path, content } of entries) {
    if (count >= MAX_FILES || total >= MAX_TOTAL_BYTES) break;
    const trimmed = content.length > MAX_FILE_BYTES
      ? content.slice(0, MAX_FILE_BYTES) + "\n/* ...truncated for import... */"
      : content;
    capped[path] = trimmed;
    total += trimmed.length;
    count += 1;
  }
  return { files: capped, truncated: entries.length > count };
}

export function parseGithubUrl(input) {
  const cleaned = input.trim().replace(/\.git$/, "").replace(/\/$/, "");
  const match = cleaned.match(/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?/);
  if (!match) throw new Error("GitHub URL samajh nahi aaya — format: https://github.com/user/repo");
  const [, owner, repo, branch] = match;
  return { owner, repo, branch };
}

export async function fetchGithubRepoFiles(repoUrl) {
  const { owner, repo, branch: branchFromUrl } = parseGithubUrl(repoUrl);

  let branch = branchFromUrl;
  if (!branch) {
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    if (!repoRes.ok) throw new Error(`Repo nahi mila (${repoRes.status}) — public hai na check kar`);
    const repoData = await repoRes.json();
    branch = repoData.default_branch;
  }

  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
  );
  if (!treeRes.ok) throw new Error(`Repo tree fetch nahi hui (${treeRes.status})`);
  const treeData = await treeRes.json();

  const candidatePaths = (treeData.tree || [])
    .filter((n) => n.type === "blob" && !shouldSkipPath(n.path))
    .slice(0, MAX_FILES);

  const entries = await Promise.all(
    candidatePaths.map(async (n) => {
      const rawRes = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${n.path}`
      );
      if (!rawRes.ok) return null;
      const content = await rawRes.text();
      return { path: "/" + n.path, content };
    })
  );

  return capFiles(entries.filter(Boolean));
}
