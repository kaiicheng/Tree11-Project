import { readFile } from "node:fs/promises";
import path from "node:path";

// set limit api 
export const config = {
  api: {
    responseLimit: false,
  },
}
// feat: pull data and return to API as route
export default async function handler(req, res) {
  try {
    const filePath = path.join(process.cwd(), "public", "num-tree11-api.geojson");
    const geojson = await readFile(filePath, "utf8");
    res.setHeader("Content-Type", "application/geo+json; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    res.status(200).send(geojson);
  } catch (error) {
    console.error("Unable to read map API snapshot", error);
    res.status(500).json({ error: "Map data is temporarily unavailable" });
  }
}
