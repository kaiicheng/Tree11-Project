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
const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Requests yielding Inspections and Work Orders',
      },
      tooltip: {
        enabled: false
      }
    },
    scales : {
      x: {
        ticks: {
          callback: (value,i) => {
            if (i % 10 == 0) {
                return value
            }
          }
        }
      }
    }
};

function getSimilarColor(inputColor) {
    inputColor = inputColor.slice(1);
    const random = Math.floor(Math.random() * 200 - 100);

    // Convert the hex color to RGB values
    const r = parseInt(inputColor.slice(0, 2), 16);
    const g = parseInt(inputColor.slice(2, 4), 16);
    const b = parseInt(inputColor.slice(4, 6), 16);
    
    const newR = Math.min(255, r + random);
    const newG = Math.min(255, g + random);
    const newB = Math.min(255, b + random);
  
    // Convert the new RGB values back to hex
    const newColor = `#${(1 << 24 | newR << 16 | newG << 8 | newB).toString(16).slice(1)}`;
    return newColor;
  }

export default function LinePlot(dataPath) {
    // const [rawData, setRawData] = useState([])
    const [data,setData] = useState([])
    const path = dataPath.data

    async function getData(path) {
        let rawData = Papa.parse(await fetchCsv(path));
        rawData = rawData.data
        console.log("called")
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
        console.log("cols", cols)
        console.log("groupData", groupData)
        console.log("labels", labels)

        const data = {
            labels,
            datasets: cols.map((val,i) => {
                let color = getSimilarColor("#A88A53")
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
    }
    
    async function fetchCsv(path) {
        const response = await fetch(path);
        const reader = response.body.getReader();
        const result = await reader.read();
        const decoder = new TextDecoder('utf-8');
        const csv = await decoder.decode(result.value);
        // console.log('csv', csv);
        return csv;
    }    
    useEffect(() => {
        getData(path)
    }, [])
    
    console.log(data)
    // return <Bar options={options} data={data} /> 
    
    return (
        data.length == 0 ? <div></div> : <Line options={options} data={data} /> 
    )
}