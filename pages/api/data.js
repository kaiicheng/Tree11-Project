// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

// fetch data from 'bucket' and return it as JSON
import tree11Small from "../../data/num-tree11-api.geojson"

// set limit api 
export const config = {
  api: {
    responseLimit: false,
  },
}
// feat: pull data and return to API as route
export default function handler(req, res) {
  res.status(200).json(tree11Small)
}
