import React from 'react';
import LineChart from './MetricLineChart';

export default function WOMetric () {
  return <LineChart data={"/data/wo_completed_weekly.csv"}/>
};