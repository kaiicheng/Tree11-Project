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

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);
const CHART_COLORS = ["#6B4F1D", "#A06F16", "#D29A24", "#2F6B5F", "#587A8A", "#765D8B"];

export default function BarPlot({ data: path, title = "Requests, inspections, and work orders" }) {
    const [data,setData] = useState(null)
    const [error, setError] = useState("")
    const options = {
        responsive: true,
        aspectRatio: 2.2,
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
        setData({ ...jsonData, datasets: jsonData.datasets.map((series, i) => ({
          ...series, backgroundColor: series.backgroundColor || CHART_COLORS[i % CHART_COLORS.length], borderColor: '#17130a', borderWidth: 1, borderRadius: 3, yAxisID: "y",
        })) });
        setError("")
        } catch (fetchError) {
          if (fetchError.name !== "AbortError") setError(fetchError.message);
        }
      }

      getData();
      return () => controller.abort();
    }, [path])

    if (error) return <p role="alert">{error}</p>;
    
    return (
        data === null ? <p role="status">Loading chart…</p> : <><Bar options={options} data={data} /><details><summary>View chart data</summary><table><thead><tr><th>Period</th>{data.datasets.map(series => <th key={series.label}>{series.label}</th>)}</tr></thead><tbody>{data.labels.map((label, index) => <tr key={label}><th>{label}</th>{data.datasets.map(series => <td key={series.label}>{series.data[index]}</td>)}</tr>)}</tbody></table></details></>
    )
}
