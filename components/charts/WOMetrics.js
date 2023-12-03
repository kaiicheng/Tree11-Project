import React from 'react';
import LineChart from './MetricLineChart';
import StackedBarChart from './MetricStackedBarChart';
import styles from './chart.module.scss'

export default function WOMetric () {
  return (
    <div>
      <div className={styles.contentContainer}>
        <div className={styles.graphContainer}>
          <LineChart data={"/data/wo_completed_weekly.csv"} title="Work Order Completed Weekly"/>
        </div>
        <div className={styles.content}>
          <b><p>HOW TO INTERPRET DATA</p></b>
          <p>
            1. Seasonal Variations: The data indicates potential seasonal trends. These could be influenced by various factors like weather changes, public usage patterns of parks during different seasons, or operational schedules of the department.
          </p>
          <p>
            2. Distinct Patterns for Different Work Types: Each type of work (Columns A to E) shows different seasonal trends. This suggests that various activities or tasks managed by the department have their own unique seasonal patterns.
         </p>
         <p>
            3. Potential Seasonal Influences: <br />
            <br />
            &nbsp;&nbsp;&nbsp;Certain types of work may increase during warmer months due to higher public usage of parks. <br/>
            <br />
            &nbsp;&nbsp;&nbsp;Other activities might peak in colder months, possibly due to maintenance or preparation for the coming seasons.
         </p>
        </div>
      </div>
      
      <div className={styles.contentContainer}>
        <div className={styles.graphContainer}>
          <LineChart data={"/data/WorkOrderType_By_Borough.csv"} title="Work Order Completed Weekly"/>
        </div>
        <div className={styles.content}>
          <b><p>HOW TO INTERPRET DATA</p></b>
          <p>
            1. Workloads differ among boroughs, with activities like 'Tree Down', 'Limb Down', and 'Hanging Limb' indicating diverse environmental challenges. Each borough shows unique work patterns influenced by factors like tree density and local conditions. 
          </p>
          <p>
            2. Activities such as 'Pest & Disease Treatment', 'Tree Removal', and 'Pruning' vary, reflecting distinct maintenance priorities. 
High-volume activities in specific boroughs may suggest regional challenges, like severe weather conditions or older tree populations.
         </p>
        </div>
      </div>

      <div className={styles.contentContainer}>
        <div className={styles.graphContainer}>
          <LineChart data={"/data/WorkOrderType_By_Month.csv"} title="Work Order Completed Weekly"/>
        </div>
        <div className={styles.content}>
          <b><p>HOW TO INTERPRET DATA</p></b>
          <p>
            1. Block Pruning and Canopy Reduction: These activities show lower average monthly completions compared to others.
          </p>
          <p>
            2. Hanging Limb, Limb Down, and Tree Down: These show higher average completions, indicating more frequent activity in these areas.
         </p>
         <p>
            3. Pest & Disease Treatment and Pruning: Moderate levels of activity are observed in these categories.
         </p>
         <p>
            4. Tree and Sidewalk Repair, Stump Removal, Tree Planting: These activities show varying levels of activity, with tree planting being notably seasonal.
         </p>
         <p>
            5. Seasonal Variations: There are clear seasonal variations in several types of work. Some activities peak in certain months, which could be due to weather conditions, changing seasons, or specific departmental operations during those times.
         </p>
        </div>
      </div>
    </div>
  )
};