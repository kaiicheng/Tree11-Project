import React, { useEffect, useState } from "react";
import Papa from 'papaparse';
import BarPlot from "./MetricBarChart";
import LinePlot from './MetricLineChart';
import StackedBarChart from './MetricStackedBarChart';
import styles from './chart.module.scss'

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
    const random = Math.floor(Math.random() * 200 - 100);
  
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

export default function CustomPlot(dataPath) {
    // const [rawData, setRawData] = useState([])
    // Initialize labels list and group dictionary

    const [data,setData] = useState([])
    const [customGroup, setCustomGroup] = useState([])
    const [columns, setColums] = useState([])
    const [labels, setLabels] = useState([])
    const [customDict, setCustomDict] = useState({})
    const [activeTab, setActiveTab] = useState("")

    const path = dataPath.data
    const title = dataPath.title

    const options_stacked = {
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

    const options = {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: title,
            fullSize: true,
          },
        },
    };

    function transpose(array) {
        return array[0].map((_, colIndex) => array.map(row => row[colIndex]));
    }

    function handleButtonClick(group) {
        const newData = {
            labels,
            datasets: columns.map((val,i) => {
                let color = getSimilarColor("#A88A53", i)
                return {
                    label: columns[i],
                    data: customDict[group][i],
                    borderColor: color,
                    backgroundColor: color,
                }
            })
        };
        setData(newData)
        setActiveTab(group)
    }

    async function getData(path) {
        let rawData = Papa.parse(await fetchCsv(path));
        rawData = rawData.data
        
        const cols = rawData[0].slice(2);
        const labels = [];
        const customDict = {};

        // Process each line (skipping header line)
        rawData.slice(1).forEach((line) => {
            const [customfilter, label, ...values] = line;
            if (!labels.includes(label)) {
                labels.push(label);
            }

            // Fill quarters dictionary
            if (!customDict[customfilter]) {
                customDict[customfilter] = [];
            }
            customDict[customfilter].push(values);
        });
        
        const customGroup = []
        for (let key in customDict) {
            customDict[key] = transpose(customDict[key])
            customGroup.push(key)
        }

        // console.log(customGroup)

        const data = {
            labels,
            datasets: cols.map((val,i) => {
                let color = getSimilarColor("#A88A53", i)
                return {
                    label: cols[i],
                    data: customDict[customGroup[0]][i],
                    borderColor: color,
                    backgroundColor: color,
                }
            })
        };

        setData(data)
        setColums(cols)
        setLabels(labels)
        setActiveTab(customGroup[0])
        setCustomDict(customDict)
        setCustomGroup(customGroup)
    }
    
    async function fetchCsv(path) {
        const response = await fetch(path);
        const reader = response.body.getReader();
        const result = await reader.read();
        const decoder = new TextDecoder('utf-8');
        const csv = await decoder.decode(result.value);
        return csv;
    }    

    useEffect(() => {
        getData(path)
    }, [])
    
    return (
        data.length == 0 ? <div></div> : 
        <div>
            <Bar options={options_stacked} data={data}/> 
            <div className={styles.buttonContainer}>
                {customGroup.map((text, index) => (
                    <button className={[styles.toggleButtons, text === activeTab ? styles.active : ''].join(' ')} key={index} onClick={() => handleButtonClick(text)}>
                        {text}
                    </button>
                ))}
            </div>
        </div>
    )
}