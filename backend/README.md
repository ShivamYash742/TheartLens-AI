# Backend Dashboard Engine

A Python FastAPI backend module that accepts uploaded CSV/JSON log files, performs Exploratory Data Analysis (EDA), and returns chart-ready JSON data for React/Next.js dashboard frontends.

## Features

- 📁 **File Upload** — CSV and JSON with automatic format detection
- 📊 **Basic Statistics** — column types, unique counts, missing values, distributions
- 🔥 **Correlation Heatmap** — matrix values (not images) for frontend rendering
- 📈 **Time-Series Analysis** — hourly, daily, weekly aggregations with datetime auto-detection
- 📊 **Bar Charts** — top-N categorical value frequencies
- 🥧 **Pie Charts** — low-cardinality category distributions
- 📉 **Distributions** — histograms for numeric columns
- 🏷️ **Top Entities** — automatic detection of IPs, users, event types, error sources
- 🖱️ **Hover Metadata** — per-chart cursor-hover insights
- 🤖 **AI Summary** — auto-generated analytical summary
- ⚡ **Async Processing** — background task queue for large files

## Quick Start

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000` with interactive docs at `http://localhost:8000/docs`.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/eda/upload` | Upload CSV/JSON file for processing |
| `GET` | `/eda/result/{id}` | Get full EDA result |
| `GET` | `/eda/status/{id}` | Lightweight status check |
| `GET` | `/eda/jobs` | List all processing jobs |
| `DELETE` | `/eda/job/{id}` | Delete a job and its file |
| `GET` | `/health` | Health check |

## Response Schema

```json
{
  "id": "abc123",
  "filename": "logs.csv",
  "status": "completed",
  "stats": { "row_count": 10000, "column_count": 15, "columns": [...] },
  "heatmap": { "columns": [...], "matrix": [[...]], "hover_data": {...} },
  "bar_charts": [{ "title": "...", "labels": [...], "values": [...], "hover_data": {...} }],
  "pie_charts": [{ "title": "...", "labels": [...], "values": [...], "hover_data": {...} }],
  "timeseries": [{ "title": "...", "timestamps": [...], "counts": [...], "hover_data": {...} }],
  "top_entities": { "top_ips": [...], "top_event_types": [...] },
  "distributions": [{ "column": "...", "bins": [...], "counts": [...], "hover_data": {...} }],
  "hover_data": { ... },
  "ai_summary": "📊 Dataset Overview: 10,000 rows × 15 columns..."
}
```

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI application entry point
│   ├── routers/
│   │   └── eda.py           # API endpoints
│   ├── services/
│   │   └── eda_service.py   # EDA analytics engine
│   ├── utils/
│   │   ├── file_loader.py   # CSV/JSON file loader
│   │   └── time_parser.py   # Datetime detection & aggregation
│   └── models/
│       └── eda_models.py    # Pydantic response schemas
├── storage/
│   └── uploads/             # Uploaded files
├── requirements.txt
└── README.md
```
