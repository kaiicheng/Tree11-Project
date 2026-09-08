import React from 'react';
import BarPlot from './MetricBarChart';

export default function WOMetric () {
  return <BarPlot data="/data/history/trend.json" title="Records changed between published refreshes" />
};
