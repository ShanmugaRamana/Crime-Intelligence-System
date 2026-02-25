# 🚔 Zone 1 Crime Intelligence System
### झोन 1 गुन्हे गुप्तचर प्रणाली — Aurangabad City Police

A real-time crime intelligence dashboard built for **Zone 1, Aurangabad City Police** to monitor, analyze, and visualize crime data across police stations.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)
![Chart.js](https://img.shields.io/badge/Chart.js-4.x-FF6384?logo=chart.js&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## ✨ Features

- **📊 Interactive Dashboard** — Rich visualizations with Chart.js including bar, doughnut, radar, and heatmap charts
- **🔄 Real-Time Updates** — Server-Sent Events (SSE) automatically push data changes to the browser when the Excel file is modified
- **🏢 Station-wise Analysis** — Dedicated view for comparing crime data across individual police stations
- **🌐 Bilingual Support** — Full English ↔ Marathi language toggle for all UI elements
- **📈 KPI Cards** — At-a-glance metrics for total crimes, under investigation, closed cases, and closure rate
- **🔍 Filters** — Filter data by year and month
- **🖨️ Print Ready** — Built-in print support for generating reports
- **📱 Responsive** — Works seamlessly across desktop and mobile devices

---

## 🗂️ Project Structure

```
├── backend/
│   ├── server.js               # Express server, Excel parser, SSE & file watcher
│   ├── package.json            # Node.js dependencies
│   └── data/
│       └── Crime_Data_Template.xlsx   # Source crime data (Excel)
│
├── frontend/
│   ├── index.html              # Overall Intelligence dashboard
│   ├── station.html            # Station-wise analysis page
│   ├── css/                    # Stylesheets
│   ├── js/
│   │   ├── app.js              # Core app logic, SSE connection, filters
│   │   ├── overall.js          # Overall dashboard charts
│   │   ├── station.js          # Station-wise charts
│   │   └── translations.js    # English ↔ Marathi translations
│   ├── img/                    # Images & icons
│   ├── fonts/                  # Custom fonts
│   └── libs/                   # Vendored libraries (Chart.js)
│
├── LICENSE
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/ShanmugaRamana/Crime-Intelligence-System.git
cd Crime-Intelligence-System

# Install dependencies
cd backend
npm install
```

### Running the Server

```bash
cd backend
npm start
```

Open your browser and navigate to **http://localhost:3000**

---

## 📊 Dashboard Views

| View | Description |
|------|-------------|
| **Overall Intelligence** | Zone-level crime summary with hotspot analysis, crime type distribution, monthly trends, heatmaps, and more |
| **Station-wise** | Drill-down into individual police station performance and crime breakdown |

### Charts Available

- Crime Hotspot — By Station (Bar)
- Crime Type Distribution (Doughnut)
- Top Crime Types (Horizontal Bar)
- Closure Rate by Station (Bar)
- Monthly Crime Trend (Line)
- Crime Density Radar (Radar)
- Investigation vs Closed (Stacked Bar)
- Month × Station Heatmap (Custom Grid)

---

## 📋 Data Format

The system reads from an Excel file (`Crime_Data_Template.xlsx`) with the following columns:

| Column | Description |
|--------|-------------|
| `Year` | Year of the record |
| `Month` | Month (1–12) |
| `Police Station` | Name of the police station |
| `Crime Type` | Category of the crime |
| `Under Investigation` | Number of cases under investigation |
| `Closed` | Number of cases closed |

> **Live Reload:** The server watches the Excel file for changes and automatically pushes updates to all connected clients via SSE.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js, Express |
| **Data Parsing** | SheetJS (xlsx) |
| **File Watching** | Chokidar |
| **Frontend** | Vanilla HTML, CSS, JavaScript |
| **Charts** | Chart.js 4.x |
| **Real-time** | Server-Sent Events (SSE) |

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
