import JSZip from "jszip";
import { shouldSkipPath, capFiles } from "../../../../lib/importers";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file) {
      return Response.json({ error: "Zip file chahiye" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const zip = await JSZip.loadAsync(buffer);

    const entries = [];
    for (const [rawPath, entry] of Object.entries(zip.files)) {
      if (entry.dir) continue;
      const path = rawPath.replace(/^[^/]+\//, "");
      if (!path || shouldSkipPath(path)) continue;
      const content = await entry.async("string");
      entries.push({ path: "/" + path, content });
    }

    if (entries.length === 0) {
      return Response.json({ error: "Zip mein koi readable code file nahi mili" }, { status: 404 });
    }

    const { files, truncated } = capFiles(entries);
    return Response.json({ files, truncated });
  } catch (e) {
    return Response.json({ error: e.message || "Zip parse fail hui" }, { status: 500 });
  }
}
