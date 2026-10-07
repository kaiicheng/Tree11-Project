import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";

import styles from "./pending-work-orders-chart.module.scss";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

export default function PendingWorkOrdersChart({ data }) {
  if (!data?.labels?.length || !data?.datasets?.[0]?.data?.length) {
    return <p className={styles.empty} role="status">No pending work-order data is available for this reporting window.</p>;
  }

  const rows = data.labels
    .map((label, index) => ({ label, value: Number(data.datasets[0]?.data[index] || 0) }))
    .sort((a, b) => b.value - a.value);
  const leadingRows = rows.slice(0, 10);
  const chartData = {
    labels: leadingRows.map((row) => row.label),
    datasets: [{
      data: leadingRows.map((row) => row.value),
      backgroundColor: "#17130a",
      borderRadius: 3,
      barPercentage: 0.72,
    }],
  };
  const options = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `${Number(context.raw).toLocaleString("en-US")} pending work orders`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: "rgba(23, 19, 10, 0.15)" },
        ticks: { color: "#4d4126", precision: 0 },
      },
      y: {
        grid: { display: false },
        ticks: { color: "#17130a", autoSkip: false, font: { size: 11 } },
      },
    },
  };

  return (
    <>
      <div className={styles.chart} role="img" aria-label="Ten work-order types with the largest pending counts">
        <Bar data={chartData} options={options} />
      </div>
      <details className={styles.dataTable}>
        <summary>View all work-order types</summary>
        <div className={styles.tableScroller}>
          <table>
            <thead><tr><th>Work-order type</th><th>Pending</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <th>{row.label}</th>
                  <td>{row.value.toLocaleString("en-US")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
