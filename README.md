# Facial Expression Recognition Using Deep Learning (CNN)

An AI-powered facial expression recognition platform and **Emotion Trend Tracker** that detects human faces in uploaded images and live webcam streams, classifies facial expressions across 7 emotion categories using Convolutional Neural Networks (CNN), and persists every detection in a local SQLite database (`detections.db`).

The repository contains two interoperable interfaces that share the same `detections.db` SQLite store at the project root:

1. **Next.js Web Application (Root Directory)** — Modern React 19 + Next.js 15 dashboard running real-time CNN face detection and 7-class expression inference in the browser via TensorFlow.js (`@vladmandic/face-api`) with SQLite API routes (`node:sqlite`).
2. **Python / Streamlit + Keras Package (`facial-expression-recognition/`)** — Modular Python implementation using OpenCV Haar Cascades, TensorFlow/Keras CNN training & inference, Plotly analytics, and Streamlit.

---

## Supported Emotion Classes

`Angry` · `Disgust` · `Fear` · `Happy` · `Neutral` · `Sad` · `Surprise`

---

## Prerequisites

- **Node.js `>= 22.5.0`** (required for Node's built-in `node:sqlite` module; verified on Node `v22.23.2`)
- **npm** (or **bun**)
- **Python `3.9 – 3.11`** *(optional — only needed to run the Streamlit app or train the custom Keras CNN on FER2013)*

---

## Option 1: Running the Next.js Web Application (Recommended)

### 1. Install Dependencies
From the repository root:

```bash
npm install
```

### 2. Environment Setup (Optional)
All core face detection, CNN inference, and SQLite features work out-of-the-box locally without any API keys. If you need environment variables, copy `.env.example`:

```bash
cp .env.example .env.local
```

### 3. Start the Development Server
```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

> **Webcam Note:** Browsers require a secure context (`http://localhost` or `https://`) and camera permission to use the **Live Webcam Detection** view.

### 4. Production Build & Start
```bash
npm run build
npm start
```

### 5. Linting
```bash
npm run lint
```

---

## Option 2: Running the Python / Streamlit App & Training the Keras CNN

The companion Python package lives inside `facial-expression-recognition/` and reads/writes the unified `detections.db` in the repository root.

### 1. Create a Virtual Environment & Install Packages
```bash
cd facial-expression-recognition
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Launch the Streamlit Dashboard
```bash
streamlit run app.py
```

### 3. (Optional) Train the Custom Keras CNN on FER2013
To train `models/emotion_model.h5` and generate real evaluation metrics (`models/training_metrics.json`, `training_history.png`, `confusion_matrix.png`):

1. Download the **FER2013** dataset (`msambare/fer2013` on Kaggle) and extract `train/` and `test/` into `facial-expression-recognition/dataset/`.
2. Run the training script:

```bash
cd facial-expression-recognition
python src/model_training.py --dataset dataset --epochs 40 --batch-size 64
```

Once `models/training_metrics.json` is created, both the Next.js **Model Information** view and the Streamlit app automatically display your real accuracy curves, confusion matrix, and classification report.

---

## Project Structure

```text
.
├── app/
│   ├── api/
│   │   ├── analytics/route.ts       # Aggregated SQLite trend & histogram queries
│   │   ├── detections/route.ts      # GET/POST/DELETE detection records & dashboard KPIs
│   │   ├── export/route.ts          # Filtered CSV export from SQLite
│   │   └── health/route.ts          # SQLite health & training_metrics.json status
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── AppShell.tsx                 # Sidebar navigation & layout shell
│   ├── Charts.tsx                   # Donut, Bar, Trend Line, Source & Confidence charts
│   └── views/                       # Dashboard, Image, Webcam, Multi-Face, Analytics, History, Model Info, About, Settings
├── lib/
│   ├── db.ts                        # node:sqlite database connection, schema & queries
│   ├── types.ts                     # Shared TypeScript interfaces & emotion metadata
│   └── visionEngine.ts              # Browser CNN inference & 48x48 grayscale preprocessing
├── public/models/                   # Pre-trained TensorFlow.js weights (SSD MobileNetV1, TinyFace, FaceExpressionNet)
├── facial-expression-recognition/   # Companion Python/Streamlit + TensorFlow/Keras package
├── detections.db                    # Local SQLite database (auto-initialized on startup)
├── next.config.ts
└── package.json
```

---

## API Endpoints & SQLite Schema

The Next.js backend automatically initializes `detections.db` with a `detections` table:

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Unique detection ID |
| `timestamp` | `DATETIME` | Local capture timestamp |
| `source` | `TEXT` | `'upload'` or `'webcam'` |
| `emotion` | `TEXT` | Predicted emotion label (7 classes) |
| `confidence` | `REAL` | Softmax confidence percentage (`0–100`) |
| `face_index` | `INTEGER` | Zero-based left-to-right face index per frame |

### HTTP Routes
- `GET /api/health` — Returns SQLite connection status, row count, file size, and `training_metrics.json` availability.
- `GET /api/detections?mode=stats` — Returns KPI totals, distribution, and recent detections.
- `GET /api/detections` — Paginated history with `search`, `emotion`, `source`, `startDate`, `endDate`, `sortBy`, and `sortDir`.
- `POST /api/detections` — Persists one or more face detections.
- `DELETE /api/detections` — Clears all stored detection records.
- `GET /api/analytics` — Returns time-series trends, source comparisons, and confidence histograms (`preset=today|7d|30d|all|custom`).
- `GET /api/export` — Downloads filtered detection records as `detections_export.csv`.

---

## Troubleshooting

- **`ERR_UNKNOWN_BUILTIN_MODULE: node:sqlite`**: Upgrade to **Node.js 22.5 or newer** (`node -v` to check).
- **CNN weights fail to load**: Ensure `public/models/` contains all 6 `.json` and `.bin` model files and restart the server.
- **Stale `.next` build errors**: If switching between `npm run build` and `npm run dev`, remove `.next` and restart:
  ```bash
  rm -rf .next && npm run dev
  ```
