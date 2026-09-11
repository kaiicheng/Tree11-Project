
import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export const options = {
  plugins: {
    title: {
      display: false,
    },
    legend: {
      display: false,
    },
  },
  responsive: true,
  scales: {
    x: {
      stacked: false,
    },
    y: {
      stacked: false,
    },
  },
};

export const optionsStacked = {
  plugins: {
    title: {
      display: false,
    },
    legend: {
      display: false,
    },
  },
  responsive: true,
  scales: {
    x: {
      stacked: true,
      ticks: { color: "#fff8e8" },
      grid: { color: "rgba(255, 248, 232, 0.16)" },
    },
    y: {
      stacked: true,
      beginAtZero: true,
      ticks: { color: "#fff8e8" },
      grid: { color: "rgba(255, 248, 232, 0.16)" },
    },
  },
};

const optionsRanked = {
  ...optionsStacked,
  indexAxis: "y",
  scales: {
    x: {
      beginAtZero: true,
      ticks: { color: "#fff8e8" },
      grid: { color: "rgba(255, 248, 232, 0.16)" },
    },
    y: {
      ticks: { color: "#fff8e8", font: { size: 11 } },
      grid: { display: false },
    },
  },
};

const optionsMultiPeriod = {
  ...optionsStacked,
  plugins: {
    ...optionsStacked.plugins,
    legend: {
      display: true,
      position: "bottom",
      labels: { color: "#fff8e8", boxWidth: 10, font: { size: 10 } },
    },
  },
};

const CHART_COLORS = ["#ffe500", "#f6a800", "#ff6b35", "#56cfe1", "#80ed99", "#c77dff", "#ff8fab", "#ffd6a5"];


export default function StackedBarChart({stacked, data}) {
  const isSinglePeriod = stacked && data.labels.length === 1;
  const chartData = {
    ...(isSinglePeriod
      ? {
        labels: data.datasets.map((dataset) => dataset.label),
        datasets: [{
          label: data.labels[0],
          data: data.datasets.map((dataset) => dataset.data[0] || 0),
          backgroundColor: "#ffe500",
          borderColor: "#8a6500",
          borderWidth: 1,
          borderRadius: 3,
        }],
      }
      : {
        ...data,
        datasets: data.datasets.map((dataset, index) => ({
          ...dataset,
          backgroundColor: dataset.backgroundColor || CHART_COLORS[index % CHART_COLORS.length],
          borderColor: dataset.borderColor || "#17130a",
          borderWidth: dataset.borderWidth ?? 1,
        })),
      }),
  };
  return <div style={isSinglePeriod ? { height: 280 } : undefined}><Bar options={isSinglePeriod ? optionsRanked : stacked ? optionsMultiPeriod : options} data={chartData} /></div>;
}
