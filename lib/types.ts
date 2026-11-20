export type EmotionLabel =
  | 'Angry'
  | 'Disgust'
  | 'Fear'
  | 'Happy'
  | 'Neutral'
  | 'Sad'
  | 'Surprise';

export const EMOTION_CLASSES: EmotionLabel[] = [
  'Angry',
  'Disgust',
  'Fear',
  'Happy',
  'Neutral',
  'Sad',
  'Surprise',
];

export const EMOTION_META: Record<
  EmotionLabel,
  {
    color: string;
    softBg: string;
    description: string;
    facialCues: string;
  }
> = {
  Angry: {
    color: '#E05252',
    softBg: '#FEF2F2',
    description: 'High-arousal negative affective state marked by tension.',
    facialCues: 'Lowered inner eyebrows, tightened eyelids, pressed lips.',
  },
  Disgust: {
    color: '#8B5CF6',
    softBg: '#F5F3FF',
    description: 'Aversion response triggered by unpleasant stimuli.',
    facialCues: 'Wrinkled nose bridge, raised upper lip, squinted eyes.',
  },
  Fear: {
    color: '#D97706',
    softBg: '#FFFBEB',
    description: 'Threat-response state involving heightened visual attention.',
    facialCues: 'Raised and drawn-together eyebrows, widened upper eyelids.',
  },
  Happy: {
    color: '#16A36A',
    softBg: '#ECFDF5',
    description: 'Positive affective state associated with joy or amusement.',
    facialCues: 'Raised cheeks, crow’s-feet wrinkles, upturned lip corners.',
  },
  Neutral: {
    color: '#64748B',
    softBg: '#F1F5F9',
    description: 'Baseline relaxed facial musculature without overt expression.',
    facialCues: 'Relaxed forehead, level mouth line, natural eye aperture.',
  },
  Sad: {
    color: '#315EAD',
    softBg: '#EFF6FF',
    description: 'Low-arousal negative state marked by downward facial cues.',
    facialCues: 'Inner eyebrows angled upward, drooping eyelids, downturned mouth.',
  },
  Surprise: {
    color: '#0891B2',
    softBg: '#ECFEFF',
    description: 'Brief startle or unexpected-event reaction.',
    facialCues: 'Arched high eyebrows, wide-open eyes, dropped jaw.',
  },
};

export type DetectionSource = 'upload' | 'webcam';

export interface DetectionRecord {
  id: number;
  timestamp: string;
  source: DetectionSource;
  emotion: EmotionLabel;
  confidence: number;
  face_index: number;
}

export interface EmotionProbability {
  emotion: EmotionLabel;
  probability: number; // 0-100 percentage
}

export interface FaceDetectionOutput {
  faceIndex: number;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  emotion: EmotionLabel;
  confidence: number; // 0-100 percentage
  probabilities: EmotionProbability[];
  grayscale48DataUrl: string; // Actual 48x48 grayscale preprocessed face crop
}

export interface DashboardStats {
  totalFacesDetected: number;
  totalImagesAnalyzed: number;
  totalWebcamDetections: number;
  mostFrequentEmotion: EmotionLabel | null;
  averageConfidence: number;
  todaysDetections: number;
  distribution: {
    emotion: EmotionLabel;
    count: number;
    percentage: number;
  }[];
  recentDetections: DetectionRecord[];
}

export interface AnalyticsSummary {
  totalDetections: number;
  happyCount: number;
  sadCount: number;
  angryCount: number;
  neutralCount: number;
  mostCommonEmotion: EmotionLabel | null;
  distribution: {
    emotion: EmotionLabel;
    count: number;
    percentage: number;
  }[];
  trendsOverTime: {
    bucket: string;
    Angry: number;
    Disgust: number;
    Fear: number;
    Happy: number;
    Neutral: number;
    Sad: number;
    Surprise: number;
    total: number;
  }[];
  sourceComparison: {
    source: DetectionSource;
    count: number;
    avgConfidence: number;
  }[];
  confidenceHistogram: {
    range: string;
    count: number;
  }[];
}

export interface AppSettings {
  detectorBackend: 'ssd_mobilenetv1' | 'tiny_face_detector';
  minConfidence: number; // 0.3 to 0.9
  webcamAutoLog: boolean;
  webcamLogIntervalSec: number;
  showPreprocessedCrop: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  detectorBackend: 'ssd_mobilenetv1',
  minConfidence: 0.45,
  webcamAutoLog: true,
  webcamLogIntervalSec: 3,
  showPreprocessedCrop: true,
};

export interface TrainingMetricsPayload {
  available: boolean;
  trainAccuracy?: number[];
  valAccuracy?: number[];
  trainLoss?: number[];
  valLoss?: number[];
  testAccuracy?: number;
  testLoss?: number;
  confusionMatrix?: number[][];
  classificationReport?: Record<
    string,
    {
      precision: number;
      recall: number;
      'f1-score': number;
      support: number;
    }
  >;
  trainedAt?: string;
}

export type ActiveSection =
  | 'dashboard'
  | 'image-detection'
  | 'webcam-detection'
  | 'multi-face'
  | 'analytics'
  | 'history'
  | 'model-info'
  | 'about'
  | 'settings';
