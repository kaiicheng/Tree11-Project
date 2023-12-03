import React from 'react';
import BarPlot from "./MetricBarChart";
import LinePlot from './MetricLineChart';
import StackedBarChart from './MetricStackedBarChart';
import CustomPlot from './CustomChart';
import styles from './chart.module.scss'

export default function SRMetric () {
  return (
    <div>
       <div className={styles.contentContainer}>
        <div className={styles.graphContainer}>
          <BarPlot data={"/data/SRs_WOs_INSs.csv"} title="SRs_WOs_INSs"/>
        </div>
        <div className={styles.content}>
          <b><p>HOW TO INTERPRET DATA</p></b>
          <p>The number of service requests, work orders, and inspections all show a similar trend over the months.
There is a visible increase in these activities, particularly starting from March, with a peak around May. This suggests a seasonal pattern, potentially related to increased park usage or maintenance needs during warmer months.</p>
          <p>
            1. There is a strong positive correlation between all three categories.
          </p>
          <p>
            2. The correlation between work orders and inspections is particularly high (0.99), indicating that a large number of work orders might directly lead to or result from inspections.
          </p>
          <p>
            3. Service requests also show a strong correlation with both work orders (0.90) and inspections (0.89), suggesting that increased service requests often coincide with heightened work orders and inspection activities.
          </p>
        </div>
      </div>
      <div className={styles.contentContainer}>
        <div className={styles.graphContainer}>
          <BarPlot data={"/data/SRs_WOs_INSs_Quarter.csv"} title="SRs_WOs_INSs Quarterly"/>
        </div>
        <div className={styles.content}>
          <b><p>HOW TO INTERPRET DATA</p></b>
          <p>
            1. The number of service requests, work orders, and inspections generally increases from Q1 to Q3, indicating a peak in activities during the warmer months.
          </p>
          <p>
            2. The decrease in Q4 suggests a seasonal reduction in park activities and corresponding maintenance needs.
         </p>
         <p>
            3. The data strongly suggests that the volume of service requests, work orders, and inspections is influenced by seasonal factors. 
         </p>
         <p>
            4. The peak in Q2 and Q3 (spring and summer) is likely due to increased park usage and the consequent need for maintenance and inspections.
         </p>
         <p>
            5. The decline in Q4 (autumn and early winter) aligns with reduced park activities as the weather gets colder.
         </p>
        </div>
      </div>
      <div className={styles.contentContainer}>
        <div className={styles.graphContainer}>
          <LinePlot data={"/data/SR_by_Risks.csv"} title="Service Requests by Source"/>
        </div>
        <div className={styles.content}>
          <b><p>HOW TO INTERPRET DATA</p></b>
          <p>
            The 3-1-1 Call Center plays a key role as a primary channel for public interaction with the park department. The substantial requests from the park department's website underscore the necessity for robust online platforms to manage public reports and inquiries.
          </p>
          <p>
            1. 3-1-1 Call Center: There is a clear upward trend in service requests from this source, peaking in the later months of the year. This suggests a significant reliance on the call center for reporting issues to the park department.
          </p>
          <p>
            2. Others & Department of Parks and Recreation - Public Web Site: These sources also show an increase in service requests over the year, with notable peaks, indicating their importance as channels for public reporting.
          </p>
          <p>
            3. AMPS & DPR - Public Tree Map: These sources have a relatively lower volume of requests but still show fluctuations over the year.
          </p>
        </div>
      </div> 
      <div className={styles.contentContainer}>
        <div className={styles.graphContainer}>
        <CustomPlot data={"/data/Riskresults_by_cat_quarter.csv"} title="Risk Results by Category Quarterly"/>
        </div>
        <div className={styles.content}>
          <b><p>HOW TO INTERPRET DATA</p></b>
          <p>
            1. Some categories, such as 'Hazard' and 'Illegal Tree Damage,' have a notable number of high-risk incidents. These categories require critical attention due to their potential severity.
          </p>
          <p>
            2. Prioritization of High-Risk Categories: Categories with a significant number of high-risk incidents should be prioritized for immediate action. This includes ensuring adequate resources and rapid response mechanisms for incidents classified as A and B risk levels.
         </p>
         <p>
            3. Resource Allocation and Planning: The data highlights the need for a strategic approach to resource allocation. Given the high volume of incidents in lower risk categories, a focus on preventive measures and routine maintenance can help manage these efficiently.
         </p>
        </div>
      </div>
      
      <div className={styles.contentContainer}>
        <div className={styles.graphContainer}>
        <LinePlot data={"/data/monthly_risk_percentages.csv"} title="Risk Results by Percentage 2022"/>
        </div>
        <div className={styles.content}>
          <b><p>HOW TO INTERPRET DATA</p></b>
          <p>
            Some categories exhibit distinct seasonal patterns with specific quarterly peaks, such as 'Hazard' and 'Prune,' possibly influenced by weather conditions or operational cycles.
          </p>
          <p>
            1. Lower risk levels (D and E) tend to have higher incident counts across most categories, suggesting a larger volume of less critical issues.
         </p>
         <p>
            2. Higher risk levels (A and B) have fewer incidents but represent more critical concerns that may require immediate attention.
         </p>
        </div>
      </div>
      
      <div className={styles.contentContainer}>
        <div className={styles.graphContainer}>
        <CustomPlot data={"/data/SR_by_source_borough.csv"} title="Service Requests by Source"/>
        </div>
        <div className={styles.content}>
          <b><p>HOW TO INTERPRET DATA</p></b>
          <p>
            The total requests by source and borough provide insights into the dominant sources of service requests in each borough. For instance, in Bronx, the 3-1-1 Call Center is the major source with 6,240 requests, followed by 'Others' with 2,909 requests.
          </p>
          <p>
            1. Brooklyn and Queens have higher overall service request volumes, suggesting greater public engagement or larger park areas necessitating more maintenance.
          </p>
          <p>
            2. There appear to be seasonal patterns, with certain months showing peaks in service requests. These patterns might correlate with park usage trends, weather conditions, and operational activities in different boroughs.
         </p>
        </div>
      </div>
    </div>
  )
};