import React, { useEffect, useState } from "react";
import Papa from 'papaparse';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    LineElement,
  } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    LineElement
);
const CHART_COLORS = ["#6B4F1D", "#A06F16", "#D29A24", "#2F6B5F", "#587A8A", "#765D8B"];

export default function LinePlot({ data: path, title = "Completed work orders by week" }) {
    // const [rawData, setRawData] = useState([])
    const [data,setData] = useState([])
    const [error, setError] = useState("")
    const options = {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: title },
          tooltip: { enabled: true }
        },
        scales : {
          x: {
            ticks: {
              callback: (value, i) => i % 10 === 0 ? value : undefined
            }
          }
        }
    };

    useEffect(() => {
      const controller = new AbortController();

      async function getData() {
        try {
        const response = await fetch(path, { signal: controller.signal });
        if (!response.ok) throw new Error(`Unable to load chart data (${response.status})`);
        let rawData = Papa.parse(await response.text(), { skipEmptyLines: true }).data;
        //  Split label and data
        let labels = []
        let cols = []
        let groupData = []
        
        cols = rawData[0].slice(1)
        for (let i = 1; i < rawData[0].length; i++) {
            const tempGroup = []
            for (let j = 1; j < rawData.length; j++) {
                if (i == 1) {
                    labels.push(rawData[j][0])
                }
                tempGroup.push(rawData[j][i])
            }
            groupData.push(tempGroup)
        }
        const data = {
            labels,
            datasets: cols.map((val,i) => {
                const color = CHART_COLORS[i % CHART_COLORS.length]
                return {
                    label: cols[i],
                    data: groupData[i],
                    borderColor: color,
                    backgroundColor: color,
                    yAxisID: "y",
                    pointRadius: 0,
                }
            })
        };      
        setData(data)
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
        data.length == 0 ? <p role="status">Loading chart…</p> : <Line options={options} data={data} />
    )
}
