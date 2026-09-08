import type { NextApiRequest, NextApiResponse } from "next";
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const query = typeof req.body?.query === "string" ? req.body.query.trim() : "";
  return res.status(200).json({ signals: query ? [{ id: `research-${Date.now()}`, text: query, source: "Project research" }] : [] });
}
