import { fetchGithubRepoFiles } from "../../../../lib/importers";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { repoUrl } = await req.json();
    if (!repoUrl) {
      return Response.json({ error: "repoUrl chahiye" }, { status: 400 });
    }
    const { files, truncated } = await fetchGithubRepoFiles(repoUrl);
    if (Object.keys(files).length === 0) {
      return Response.json(
        { error: "Koi readable file nahi mili is repo mein" },
        { status: 404 }
      );
    }
    return Response.json({ files, truncated });
  } catch (e) {
    return Response.json({ error: e.message || "Import fail hua" }, { status: 500 });
  }
}
