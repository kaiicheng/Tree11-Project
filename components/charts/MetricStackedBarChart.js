import React, { useEffect, useState } from "react";
import Papa from 'papaparse';
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

export default function StackedBarChart(dataOps) {
    // console.log("Stack bar called")
    const [data,setData] = useState([])
    const [error, setError] = useState("")
    const path = dataOps.data
    const title = dataOps.title
    const options = {
        plugins: {
            legend: {
                display: false,
            },
            title: {
                display: true,
                text: title,
            },
        },
        responsive: true,
        scales: {
            x: {
                stacked: true,
            },
            y: {
                stacked: true,
            },
        },
    };

    useEffect(() => {
      if (dataOps.custom || !path) return;

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
        // console.log("cols", cols)
        // console.log("groupData", groupData)
        // console.log("labels", labels)

        const data = {
            labels,
            datasets: cols.map((val,i) => {
                const color = CHART_COLORS[i % CHART_COLORS.length]
                return {
                    label: cols[i],
                    data: groupData[i],
                    borderColor: color,
                    backgroundColor: color,
                    // yAxisID: "y",
                    // pointRadius: 0,
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
    }, [dataOps.custom, path])

    if (dataOps.custom) return <Bar options={options} data={dataOps.customData}/>;
    if (error) return <p role="alert">{error}</p>;
    
    // console.log(data)

    return (
        data.length == 0 ? <p role="status">Loading chart…</p> : <Bar options={options} data={data}/>
    )
    // return <Bar options={options} data={data} />;
}
