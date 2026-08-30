import { runInSandbox } from "../../../lib/sandboxRun";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req) {
  try {
    const { files, runtime: projectRuntime } = await req.json();
    if (!files || Object.keys(files).length === 0) {
      return Response.json({ error: "Koi files nahi hai run karne ke liye" }, { status: 400 });
    }
    const result = await runInSandbox({ files, runtime: projectRuntime });
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e.message || "Run fail hua" }, { status: 500 });
  }
}
