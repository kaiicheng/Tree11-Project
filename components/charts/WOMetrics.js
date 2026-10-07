import React from 'react';
import BarPlot from './MetricBarChart';

export default function WOMetric () {
  return <BarPlot data="/data/charts/operational_volume_monthly.json" title="Monthly work orders" datasetLabel="Work orders" maxPeriods={6} />
};
