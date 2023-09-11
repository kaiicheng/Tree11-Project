// This file contains formatted JSON data for the ChartJS data
export const static_data = {
  uninspected: 2072,
  last_month_requests: 23152,
  total_2022: 23453,
}
export const sr_to_insp_or_wo = {
  labels: [
    "Hazard",
    "Illegal Tree Damage",
    "Pest/Disease",
    "Plant Tree",
    "Planting Space",
    "Prune",
    "Remove Debris",
    "Remove Stump",
    "Remove Tree",
    "Rescue/Preservation",
    "Root/Sewer/Sidewalk",
  ],
  datasets: [
    {
      data: [
        4.6299216981, 3.9497584541, 4.0540540541, 0.6978558954, 1.7857142857,
        2.7125098187, 2.4553571429, 8.3946980854, 6.69370417, 2.5547445255,
        2.3778419962,
      ],
      backgroundColor: ["#C4C3B8", "#FFFFFF"],
    },
  ],
};

export const sr_by_source = {
  labels: ["January", "February", "March", "April", "May", "June", "July"],
  datasets: [
    {
      label: "311 Call Center",
      data: [
        2424.0, 2721.0, 4537.0, 4892.0, 6948.0, 9278.0, 7877.0, 7948.0, 17.0,
        6.0, 1.0,
      ],
      backgroundColor: "#9A6600",
    },
    {
      label: "DOT",
      data: [0.0, 0.0, 26.0, 234.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
      backgroundColor: "#FFB21D",
    },
    {
      label: "DPR - Public Website",
      data: [
        664.0, 734.0, 1413.0, 1645.0, 2206.0, 2697.0, 2277.0, 1687.0, 4.0, 0.0,
        0.0,
      ],
      backgroundColor: "#FFE500",
    },
  ],
};

export const pending_wo_by_type = {
  labels: ["January", "February", "March", "April", "May", "June", "July", "August"],
  datasets: [
    {
      label: "Limb Down / Hanging",
      data: [
        2, 5, 20, 15, 4, 4, 18,13,9
      ],
      // backgroundColor: "#9A6600",
    },
    {
      label: "Pruning",
      data: [13, 11, 11, 13, 23, 22,23,16
      ],
      // backgroundColor: "#FFB21D",
    },
    {
      label: "Tree / Stump Removal",
      data: [
        8, 6, 18, 15, 39, 86,73,77
      ],
      // backgroundColor: "#FFE500",
    },
    {
      label: "Tree Plant",
      data: [
        5, 10, 6, 11, 20,7, 8,4
      ],
      // backgroundColor: "#FFE500",
    },
    {
      label: "Preservation",
      data: [
        0.0, 0.0, 0.0, 4, 0,0, 0, 0
      ],
      // backgroundColor: "#FFE500",
    },
    {
      label: "Canopy Reduction",
      data: [
        0.0, 0.0, 0.0, 0, 1, 0, 0, 1
      ],
      // backgroundColor: "#FFE500",
    },
    {
      label: "Tree Removal for Tree Planting",
      data: [
        0.0, 0.0, 0.0, 0, 2, 0, 1,0
      ],
      // backgroundColor: "#FFE500",
    },
    {
      label: "Misc Work",
      data: [
        0.0, 0.0, 0.0,0, 0,0, 1, 0
      ],
      // backgroundColor: "#FFE500",
    },
    {
      label: "Pest & Disease Treatment",
      data: [
        0.0, 0.0, 0.0,0,0,0,1, 0
      ],
      // backgroundColor: "#FFE500",
    },
  ],
};
