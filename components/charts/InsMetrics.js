import React from 'react';
import BarPlot from "./MetricBarChart";

export default function InsMetric () {
  return <BarPlot data="/data/charts/inspections_by_risk_monthly.json" title="Monthly inspections by risk rating" />;
};
