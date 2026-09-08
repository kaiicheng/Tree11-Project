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

export default function LineChart({data}) {
  return <Line options={options} data={data} height={90}/>;
}
