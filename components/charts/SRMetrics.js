import React from 'react';
import BarPlot from "./MetricBarChart";

export default function SRMetric () {
  return <BarPlot data="/data/charts/operational_volume_monthly.json" title="Monthly service requests, inspections, and work orders" />;
};
