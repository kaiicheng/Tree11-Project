import type { NextApiRequest, NextApiResponse } from "next";
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  return res.status(200).json({ id: `generation-${Date.now()}`, prompt: req.body?.prompt || "", influence: req.body?.influence || null });
}
