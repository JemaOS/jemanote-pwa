// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import { Play, Pause } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface WaveformPlayerProps {
  readonly blob: Blob;
  readonly height?: number;
  readonly color?: string;
  readonly progressColor?: string;
}

export default function WaveformPlayer({
  blob,
  height = 48,
  color = 'rgb(212, 212, 212)',
  progressColor = '#5a63e9',
}: WaveformPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!blob) {
      return;
    }

    // Générer waveform
    const generateWaveform = async () => {
      try {
        const arrayBuffer = await blob.arrayBuffer();
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const rawData = audioBuffer.getChannelData(0);
        const samples = 60; // Moins de barres pour un affichage compact
        const blockSize = Math.floor(rawData.length / samples);
        const waveform: number[] = [];

        for (let i = 0; i < samples; i++) {
          const start = blockSize * i;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[start + j]);
          }
          waveform.push(sum / blockSize);
        }

        // Normaliser
        const max = Math.max(...waveform);
        const normalized = waveform.map(v => v / max);
        setWaveformData(normalized);
        setDuration(audioBuffer.duration);

        audioContext.close();
      } catch (error) {
        console.error('Erreur génération waveform:', error);
      }
    };

    generateWaveform();

    // Setup audio element
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audioRef.current = audio;

    // Utiliser requestAnimationFrame pour une mise à jour fluide
    const updateProgress = () => {
      if (audio.paused || audio.ended) {
        animationRef.current = null;
        return;
      }
      setCurrentTime(audio.currentTime);
      animationRef.current = requestAnimationFrame(updateProgress);
    };

    audio.onloadedmetadata = () => {
      if (audio.duration && Number.isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    audio.onplay = () => {
      setIsPlaying(true);
      animationRef.current = requestAnimationFrame(updateProgress);
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };

    audio.onpause = () => {
      setIsPlaying(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };

    return () => {
      audio.pause();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      URL.revokeObjectURL(url);
    };
  }, [blob]);

  const togglePlay = () => {
    if (!audioRef.current) {
      return;
    }
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleSeek = (index: number) => {
    if (!audioRef.current || waveformData.length === 0) {
      return;
    }

    const percentage = index / waveformData.length;
    const newTime = percentage * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 p-2 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm select-none max-w-md">
      <button
        onClick={togglePlay}
        className="flex items-center justify-center w-8 h-8 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-all flex-shrink-0"
      >
        {isPlaying ? (
          <Pause className="h-4 w-4 fill-white" />
        ) : (
          <Play className="h-4 w-4 ml-0.5 fill-white" />
        )}
      </button>

      <div
        className="flex-1 h-8 cursor-pointer relative"
        role="slider" // NOSONAR
        tabIndex={0}
        aria-label="Seek audio"
        aria-valuenow={currentTime}
        aria-valuemin={0}
        aria-valuemax={duration}
        onKeyDown={e => {
          if (waveformData.length === 0 || duration === 0) return;
          const currentIndex = Math.floor((currentTime / duration) * waveformData.length);
          if (e.key === 'ArrowLeft') {
            handleSeek(Math.max(0, currentIndex - 1));
          } else if (e.key === 'ArrowRight') {
            handleSeek(Math.min(waveformData.length - 1, currentIndex + 1));
          }
        }}
        onClick={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const percentage = x / rect.width;
          const index = Math.floor(percentage * waveformData.length);
          handleSeek(Math.max(0, Math.min(index, waveformData.length - 1)));
        }}
      >
        {waveformData.map((value, idx) => {
          const progress = duration > 0 ? currentTime / duration : 0;
          const isPassed = idx / waveformData.length <= progress;

          return (
            <div
              key={`waveform-${value}`}
              className="flex-1 rounded-full transition-all pointer-events-none"
              style={{
                height: `${Math.max(20, value * 100)}%`,
                backgroundColor: isPassed ? progressColor : color,
              }}
            />
          );
        })}

        {/* Ligne de lecture (Playhead) */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-primary-600 pointer-events-none transition-none"
          style={{
            left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
            willChange: 'left',
          }}
        />
      </div>

      <div className="text-xs font-mono text-neutral-500 dark:text-neutral-400 w-10 text-right flex-shrink-0">
        {formatTime(currentTime)}
      </div>
    </div>
  );
}
