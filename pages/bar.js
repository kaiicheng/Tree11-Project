// import React, { useEffect, useRef, useState } from "react";
// import * as d3 from "d3";
// // import Button from "../components/buttons/buttons";

// export default function BarPlot() {
//   // console.log("running");
//   const svgRef = useRef();
//   const [data, setData] = useState([
//     // {
//     //   month: " Feb",
//     //   SRs: "4311",
//     //   WOs: "1745",
//     //   INSs: "2555",
//     // },
//   ]);
//   const [selectedVar, setSelectedVar] = useState("SRs");
//   // Variable defs
//   var margin = { top: 30, right: 30, bottom: 70, left: 60 };
//   var width = 460 - margin.left - margin.right;
//   var height = 400 - margin.top - margin.bottom;
//   // var svg = d3.select(svgRef.current)
//   //             .append("svg")
//   //             .attr("width", width + margin.left + margin.right)
//   //             .attr("height", height + margin.top + margin.bottom)
//   //             .append("g")
//   //             .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
//   // Initialize the X axis
//   // var x = d3.scaleBand().range([0, width]).padding(0.2);
//   // var xAxis = svg.append("g").attr("transform", "translate(0," + height + ")");
  
//   // // Initialize the Y axis
//   // var y = d3.scaleLinear().range([height, 0]);
//   // var yAxis = svg.append("g").attr("class", "myYaxis");
  
//   useEffect(() => {
//     d3.csv("SRs_WOs_INSs.csv").then((csv_data) => {
//       console.log("Read the d3.csv", csv_data);
//       setData(csv_data);
//     });
//   }, []);

//   return (
//     <React.Fragment>
//       <button onClick={() => setSelectedVar("SRs")}>SRs</button>
//       <button onClick={() => setSelectedVar("WOs")}>WOs</button>
//       <button onClick={() => setSelectedVar("INSs")}>INSs</button>
//       {/* <svg ref={svgRef}></svg> */}
//       <svg viewBox="0 0 100 50">
//         {data.map((val, i) => {
//           console.log(val);
//           return (
//             <rect width={8} height={val[selectedVar] % 10} x={i * 10} y={10} />
//           );
//         })}
//       </svg>
//     </React.Fragment>
//   );
// }





//  // useEffect(() => {
//   //   updatePlot()
//   // }, [selectedVar])

//   // useEffect(() => {
//   //   console.log("test useEffect");
//   //   console.log(data);
//   //   if (!data) return;
//   //   console.log("attempting to draw");

//   //   // variable u: map data to existing bars
//   //   var u = svg.selectAll("rect").data(data);

//   //   // update bars
//   //   u.enter()
//   //     .append("rect")
//   //     .merge(u)
//   //     .transition()
//   //     .duration(1000)
//   //     .attr("x", function (d) {
//   //       return x(d.month);
//   //     })
//   //     .attr("y", function (d) {
//   //       return y(d[selectedVar]);
//   //     })
//   //     .attr("width", x.bandwidth())
//   //     .attr("height", function (d) {
//   //       return height - y(d[selectedVar]);
//   //     })
//   //     .attr("fill", "#69b3a2");
//   // }, [data]);

//   // useEffect(() => {
//   //   const svgElement = d3.select(svgRef.current);
//   //   console.log(svgElement);
//   //   console.log(data);
//   //   // svgElement.selectAll('rect')
//   //   //   .data(data)
//   //   //     .join("rect")
//   //   //       .attr("cx", d => d[0])
//   //   //       .attr("cy", d => d[1])
//   //   //       .attr("r",  3)
//   // }, []);

//   /**
//     useEffect(() => {
//         console.log(selectedVar)
//         updatePlot()
//     }, [selectedVar])

//     // set the dimensions and margins of the graph
//     var dataCSV
//     var margin = {top: 30, right: 30, bottom: 70, left: 60},
//         width = 460 - margin.left - margin.right,
//         height = 400 - margin.top - margin.bottom;
//     var svg
//     var x, y
//     var xAxis, yAxis

//     function initialize () {
//         dataCSV = d3.csv(data)
//         svg = d3.select(svgRef.current)
//             .append("svg")
//             .attr("width", width + margin.left + margin.right)
//             .attr("height", height + margin.top + margin.bottom)
//             .append("g")
//             .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

//         // Initialize the X axis
//         x = d3.scaleBand()
//             .range([ 0, width ])
//             .padding(0.2);
//         xAxis = svg.append("g")
//                 .attr("transform", "translate(0," + height + ")")

//         // Initialize the Y axis
//         y = d3.scaleLinear()
//             .range([ height, 0]);
//         yAxis = svg.append("g")
//             .attr("class", "myYaxis")
//     }


//         useEffect(() => {
//             initialize()
//             setSelectedVar("SRs")
//         }, [])
//      */



//         // function updatePlot() {
//         //   // X axis
//         //   x.domain(data.map(function(d) { return d.month;}))
//         //   xAxis.transition().duration(1000).call(d3.axisBottom(x))
      
//         //   // Add Y axis
//         //   y.domain([0, d3.max(data, function(d) { return +d[selectedVar]})]);
//         //   yAxis.transition().duration(1000).call(d3.axisLeft(y));
      
//         //   // variable u: map data to existing bars
//         //   var u = svg.selectAll("rect").data(data)
      
//         //   // update bars
//         //   u
//         //       .enter()
//         //       .append("rect")
//         //       .merge(u)
//         //       .transition()
//         //       .duration(1000)
//         //       .attr("x", function(d) { return x(d.month); })
//         //       .attr("y", function(d) { return y(d[selectedVar]); })
//         //       .attr("width", x.bandwidth())
//         //       .attr("height", function(d) { return height - y(d[selectedVar]); })
//         //       .attr("fill", "#69b3a2")
//         // }