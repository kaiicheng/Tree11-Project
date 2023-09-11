// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

// fetch data from 'bucket' and return it as JSON
import dataDemo from "../../data/dataDemo.json"

// feat: pull data and return to API as route
export default function handler(req, res) {
  res.status(200).json(dataDemo)
}
