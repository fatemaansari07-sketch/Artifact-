import { wrapBrowserProject } from "../../../lib/deployWrap";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { files, dependencies, runtime: projectRuntime, projectName } = await req.json();

    if (!files || Object.keys(files).length === 0) {
      return Response.json({ error: "Koi files nahi hai deploy karne ke liye" }, { status: 400 });
    }

    const token = process.env.VERCEL_API_TOKEN;
    if (!token) {
      return Response.json(
        { error: "VERCEL_API_TOKEN set nahi hai server pe (Vercel env vars mein daal ke redeploy kar)" },
        { status: 501 }
      );
    }

    if (projectRuntime === "node") {
      return Response.json(
        {
          error:
            "Ye ek backend/bot project hai. Vercel serverless functions request-response ke liye bane hain — persistent bots (jaise Telegram polling bot) yahan seedha deploy nahi ho sakte. Code CodePanel se copy karke Railway/Render/VPS pe chala — wahan 'always-on' hosting milti hai.",
        },
        { status: 422 }
      );
    }

    const fileList = wrapBrowserProject(files, dependencies || {});
    const teamId = process.env.VERCEL_TEAM_ID;
    const url = `https://api.vercel.com/v13/deployments${teamId ? `?teamId=${teamId}` : ""}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: (projectName || "forge-app").toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 50) || "forge-app",
        files: fileList,
        projectSettings: { framework: "vite" },
        target: "production",
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return Response.json(
        { error: data?.error?.message || `Vercel deploy fail hua (${res.status})` },
        { status: 502 }
      );
    }

    return Response.json({
      url: `https://${data.url}`,
      inspectorUrl: data.inspectorUrl || null,
    });
  } catch (e) {
    return Response.json({ error: e.message || "Deploy fail hua" }, { status: 500 });
  }
}
