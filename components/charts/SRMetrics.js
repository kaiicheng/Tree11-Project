import React from 'react';
import BarPlot from "./MetricBarChart";

export default function SRMetric () {
  return <BarPlot data={"/data/SRs_WOs_INSs.csv"}/>;
};