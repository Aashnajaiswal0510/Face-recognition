# Facial Expression Recognition Using Deep Learning (CNN)

**Academic Project Synopsis Implementation**
- **Author:** Aashna Jaiswal (Enroll No.: `MUIT/24-25/17072024001`, Roll No.: `2402031117001`)
- **Guidance:** Mrs. Shabda, Maharishi School of Engineering & Technology
- **Institution:** Maharishi University of Information Technology, Noida (BCA Session 2026–2027)

---

## Architecture Pipeline

```
Input Image / Webcam Frame
        ↓
Face Detection (OpenCV Haar Cascade)
        ↓
Preprocessing (Grayscale → Resize 48×48 → Normalize [0, 1])
        ↓
CNN Model (7-Class Softmax Expression Classification)
        ↓
Labeled Output (Bounding Box + Emotion + Confidence %)
        ↓
SQLite 3 Database (detections.db → detections table)
        ↓
Streamlit Web Application (Emotion Trend Tracker Dashboard)
```

---

## Folder Structure

```
facial-expression-recognition/
├── app.py
├── config.py
├── requirements.txt
├── README.md
├── assets/
│   └── styles.css
├── models/
│   ├── emotion_model.h5
│   └── haarcascade_frontalface_default.xml
├── src/
│   ├── face_detection.py
│   ├── preprocessing.py
│   ├── emotion_classifier.py
│   ├── webcam.py
│   ├── database.py
│   ├── analytics.py
│   └── model_training.py
├── pages/
│   ├── dashboard.py
│   ├── image_detection.py
│   ├── webcam_detection.py
│   ├── multi_face_detection.py
│   ├── analytics.py
│   ├── history.py
│   ├── model_info.py
│   ├── about.py
│   └── settings.py
├── dataset/
└── exports/
```

---

## Setup & Execution

### 1. Create Virtual Environment & Install Dependencies
```bash
cd facial-expression-recognition
python3 -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Download FER2013 Dataset & Train the CNN Model
Download the FER2013 dataset from Kaggle (`msambare/fer2013`) and extract `train/` and `test/` directories into `dataset/`:
```bash
dataset/
├── train/
│   ├── angry/
│   ├── disgust/
│   ├── fear/
│   ├── happy/
│   ├── neutral/
│   ├── sad/
│   └── surprise/
└── test/
    └── ...
```
Then run the standalone training pipeline:
```bash
python src/model_training.py --dataset dataset --epochs 40 --batch-size 64
```
This saves:
- `models/emotion_model.h5`
- `models/training_metrics.json`
- `models/training_history.png`
- `models/confusion_matrix.png`

### 3. Launch the Streamlit Application
```bash
streamlit run app.py
```
The SQLite database `detections.db` is initialized automatically on startup.
