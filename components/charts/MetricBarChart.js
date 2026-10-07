import React, { useEffect, useState } from "react";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
  } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import styles from "./metric-bar-chart.module.scss";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);
const CHART_COLORS = ["#6B4F1D", "#A06F16", "#D29A24", "#2F6B5F", "#587A8A", "#765D8B"];

function prepareChartData(jsonData, { datasetLabel, maxPeriods, numericDatasetOrder }) {
  let datasets = Array.isArray(jsonData.datasets) ? [...jsonData.datasets] : [];

  if (datasetLabel) {
    datasets = datasets.filter((series) => series.label === datasetLabel);
  }

  if (numericDatasetOrder) {
    datasets.sort((a, b) => Number(a.label) - Number(b.label));
  }

  const labels = Array.isArray(jsonData.labels) ? jsonData.labels : [];
  let indices = labels.map((_, index) => index);

  if (maxPeriods && indices.length > maxPeriods) {
    const meaningful = indices.filter((index) => datasets.some((series) => {
      const value = Number(series.data?.[index]);
      return Number.isFinite(value) && value !== 0;
    }));
    indices = (meaningful.length ? meaningful : indices).slice(-maxPeriods);
  }

  return {
    ...jsonData,
    labels: indices.map((index) => labels[index]),
    datasets: datasets.map((series, index) => ({
      ...series,
      data: indices.map((dataIndex) => series.data?.[dataIndex] ?? 0),
      backgroundColor: series.backgroundColor || CHART_COLORS[index % CHART_COLORS.length],
      borderColor: "#17130a",
      borderWidth: 1,
      borderRadius: 3,
      yAxisID: "y",
    })),
  };
}

export default function BarPlot({
  data: path,
  title = "Requests, inspections, and work orders",
  datasetLabel,
  maxPeriods,
  numericDatasetOrder = false,
}) {
    const [data,setData] = useState(null)
    const [error, setError] = useState("")
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { color: '#17130a', boxWidth: 12, padding: 16 } },
          title: { display: true, text: title, color: '#17130a', font: { size: 14, weight: '600' }, padding: { bottom: 18 } },
        },
        scales: {
          x: { ticks: { color: '#4d4126' }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { color: '#4d4126' }, grid: { color: 'rgba(77, 65, 38, 0.16)' } },
        },
    };

    useEffect(() => {
      const controller = new AbortController();

      async function getData() {
        try {
        const response = await fetch(path, { signal: controller.signal });
        if (!response.ok) throw new Error(`Unable to load chart data (${response.status})`);
        if (!path.endsWith(".json")) throw new Error("Chart asset must be generated JSON");
        const jsonData = await response.json();
        setData(prepareChartData(jsonData, { datasetLabel, maxPeriods, numericDatasetOrder }));
        setError("")
        } catch (fetchError) {
          if (fetchError.name !== "AbortError") setError(fetchError.message);
        }
      }

      getData();
      return () => controller.abort();
    }, [path, datasetLabel, maxPeriods, numericDatasetOrder])

    if (error) return <p role="alert">{error}</p>;
    
    return (
        data === null ? <p role="status">Loading chart…</p> : <><div className={styles.chart}><Bar options={options} data={data} /></div><details><summary>View chart data</summary><div className={styles.tableScroller}><table><thead><tr><th>Period</th>{data.datasets.map(series => <th key={series.label}>{series.label}</th>)}</tr></thead><tbody>{data.labels.map((label, index) => <tr key={label}><th>{label}</th>{data.datasets.map(series => <td key={series.label}>{series.data[index]}</td>)}</tr>)}</tbody></table></div></details></>
    )
}
