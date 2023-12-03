import React from 'react';
import StackedBarChart from './MetricStackedBarChart';
import styles from './chart.module.scss'

export default function InsMetric () {
  return (
    <div>
      <div className={styles.contentContainer}>
        <div className={styles.graphContainer}>
          <StackedBarChart data={"/data/Inspections_By_Risk_Monthly.csv"} title="Inspections by Risk Monthly"/>
        </div>
        <div className={styles.content}>
          <b><p>HOW TO INTERPRET DATA</p></b>
          <p>
            1. There are clear seasonal variations in the number of inspections reported across different risk categories. This suggests that certain times of the year may have more park-related issues requiring inspection, possibly due to weather conditions, increased park usage, or other seasonal factors.
          </p>
          <p>
            2. Higher Risk Categories (A and B): These categories show lower overall numbers but with noticeable fluctuations across months. The peaks and troughs could indicate times of the year when more severe issues are likely to be reported.
         </p>
         <p>
            3. Lower Risk Categories (C, D, and E): These categories have higher overall numbers of inspections, with category D consistently showing the highest numbers across all months. The fluctuations in these categories might be influenced by general park maintenance activities, public usage patterns, or seasonal weather changes.
         </p>
        </div>
      </div>
      
      <div className={styles.contentContainer}>
        <div className={styles.graphContainer}>
          <StackedBarChart data={"/data/Inspections_By_Risk_Quarterly.csv"} title="Inspections by Risk Quarterly"/>
        </div>
        <div className={styles.content}>
          <b><p>HOW TO INTERPRET DATA</p></b>
          <p>
            1. Seasonal variations in inspections across risk categories suggest specific quarters with more park issues, influenced by seasonal changes, weather, or increased park usage. 
          </p>
          <p>
            2. Higher risk categories (A and B) show lower overall numbers but noticeable fluctuations, potentially indicating periods of reporting more severe issues. 
         </p>
         <p>
            3. Lower risk categories (C, D, and E) consistently have higher inspection numbers, with category D consistently the highest, likely influenced by park maintenance, public usage, or seasonal weather changes.
         </p>
        </div>
      </div>

      <div className={styles.contentContainer}>
        <div className={styles.graphContainer}>
          <StackedBarChart data={"/data/Inspections_vs_WorkOrders_By_Quarter.csv"} title="Inspections by Work Orders Quarterly"/>
        </div>
        <div className={styles.content}>
          <b><p>HOW TO INTERPRET DATA</p></b>
          <p>
            1. Seasonal variations in inspections and work orders suggest specific quarters with increased park-related issues, influenced by seasonal changes, weather conditions, or higher park usage.
          </p>
          <p>
            2. The trends in inspections and work orders appear to be closely related. Quarters with higher numbers of inspections also tend to have higher numbers of work orders, suggesting a direct correlation between the need for inspection and the generation of work orders.
         </p>
        </div>
      </div>
    </div>
  )
};