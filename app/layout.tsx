import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Facial Expression Recognition Using Deep Learning (CNN)',
  description:
    'AI-powered facial expression recognition platform with real CNN inference, multi-face detection, live webcam analysis, and SQLite Emotion Trend Tracker.',
  openGraph: {
    title: 'Facial Expression Recognition Using Deep Learning (CNN)',
    description:
      'AI-powered facial expression recognition platform with real CNN inference, multi-face detection, live webcam analysis, and SQLite Emotion Trend Tracker.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Facial Expression Recognition Using Deep Learning (CNN)',
    description:
      'AI-powered facial expression recognition platform with real CNN inference, multi-face detection, live webcam analysis, and SQLite Emotion Trend Tracker.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#F8FAFC] text-[#172033] antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
