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

function getSimilarColor(inputColor,i) {
    inputColor = inputColor.slice(1);
    // Convert the hex color to RGB values
    const r = parseInt(inputColor.slice(0, 2), 16);
    const g = parseInt(inputColor.slice(2, 4), 16);
    const b = parseInt(inputColor.slice(4, 6), 16);
    
    const newR = Math.min(255, r + 20*i);
    const newG = Math.min(255, g + 10*i);
    const newB = Math.min(255, b + 10*i);
  
    // Convert the new RGB values back to hex
    const newColor = `#${(1 << 24 | newR << 16 | newG << 8 | newB).toString(16).slice(1)}`;
    return newColor;
  }

export default function StackedBarChart(dataOps) {
    // console.log("Stack bar called")
    const [data,setData] = useState([])
    const path = dataOps.data
    const title = dataOps.title
    const options = {
        plugins: {
            title: {
                display: false,
            },
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

    if (dataOps.custom) {
        console.log(dataOps.customData)
        return (<Bar options={options} data={dataOps.customData}/>)
    }
    async function getData(path) {
        let rawData = Papa.parse(await fetchCsv(path));
        rawData = rawData.data
        
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
                let color = getSimilarColor("#A88A53", i)
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
    
    // console.log(data)

    return (
        data.length == 0 ? <div></div> : <Bar options={options} data={data}/> 
    )
    // return <Bar options={options} data={data} />;
}
