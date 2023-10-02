// Documentation for ChartJS + react-chartjs-2: https://www.chartjs.org/docs & https://react-chartjs-2.js.org/examples/line-chart

import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import faker from "faker";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export const options = {
  responsive: true,

  plugins: {
    title: {
      display: false,
    },
    legend: {
      display: false,
    }
  },
  scales: {
    x: {
      display: true,
    },
    y: {
      display: true,
    },
    y1: {
      type: "linear",
      display: false,
      position: "right",
      grid: {
        drawOnChartArea: false,
      },
    },
  },
};

const labels = ["January", "February", "March", "April", "May", "June", "July", "August"];

export const data = {
  labels,
  datasets: [
    {
      label: "Requests",
      data: labels.map(() => faker.datatype.number({ min: -1000, max: 1000 })),
      borderColor: "000000",
      backgroundColor: "#000000",
      yAxisID: "y",
    },
    {
      label: "Inspections",
      data: labels.map(() => faker.datatype.number({ min: -1000, max: 1000 })),
      borderColor: "#C4C3B8",
      backgroundColor: "#C4C3B8",
      yAxisID: "y1",
    },
  ],
};

export default function LineChart({data}) {
  return <Line options={options} data={data} height={90}/>;
}
