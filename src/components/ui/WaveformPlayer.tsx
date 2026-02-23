// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import { Play, Pause } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';

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

  const stopAnimation = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const startAnimation = useCallback(
    (audio: HTMLAudioElement) => {
      stopAnimation();
      const tick = () => {
        setCurrentTime(audio.currentTime);
        if (!audio.paused && !audio.ended) {
          animationRef.current = requestAnimationFrame(tick);
        } else {
          animationRef.current = null;
        }
      };
      animationRef.current = requestAnimationFrame(tick);
    },
    [stopAnimation]
  );

  useEffect(() => {
    if (!blob) {
      return;
    }

    // Générer waveform via Web Audio API
    const generateWaveform = async () => {
      try {
        const arrayBuffer = await blob.arrayBuffer();
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const rawData = audioBuffer.getChannelData(0);
        const samples = 60;
        const blockSize = Math.floor(rawData.length / samples);
        const waveform: number[] = [];

        for (let i = 0; i < samples; i++) {
          const start = blockSize * i;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[start + j] ?? 0);
          }
          waveform.push(sum / blockSize);
        }

        // Normaliser
        const max = Math.max(...waveform);
        const normalized = max > 0 ? waveform.map(v => v / max) : waveform;
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

    audio.onloadedmetadata = () => {
      if (audio.duration && Number.isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    audio.onplay = () => {
      setIsPlaying(true);
      startAnimation(audio);
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      stopAnimation();
    };

    audio.onpause = () => {
      setIsPlaying(false);
      stopAnimation();
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    return () => {
      audio.pause();
      stopAnimation();
      URL.revokeObjectURL(url);
      audioRef.current = null;
    };
  }, [blob, startAnimation, stopAnimation]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        console.error('Erreur lecture audio:', err);
      });
    }
  };

  const handleSeek = (percentage: number) => {
    if (!audioRef.current || duration === 0) return;
    const newTime = percentage * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div className="flex items-center gap-3 p-2 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm select-none w-full max-w-md">
      {/* Play/Pause button */}
      <button
        onClick={togglePlay}
        className="flex items-center justify-center w-8 h-8 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-all flex-shrink-0"
        aria-label={isPlaying ? 'Pause' : 'Lecture'}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4 fill-white" />
        ) : (
          <Play className="h-4 w-4 ml-0.5 fill-white" />
        )}
      </button>

      {/* Waveform + playhead */}
      <div // NOSONAR
        className="relative flex-1 cursor-pointer overflow-hidden"
        style={{ height }}
        role="slider"
        tabIndex={0}
        aria-label="Seek audio"
        aria-valuenow={currentTime}
        aria-valuemin={0}
        aria-valuemax={duration}
        onKeyDown={e => {
          if (duration === 0) return;
          if (e.key === 'ArrowLeft') {
            handleSeek(Math.max(0, progress - 0.02));
          } else if (e.key === 'ArrowRight') {
            handleSeek(Math.min(1, progress + 0.02));
          }
        }}
        onClick={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          handleSeek(Math.max(0, Math.min(1, x / rect.width)));
        }}
      >
        {/* Bars container — flex row, items centered vertically */}
        <div className="absolute inset-0 flex items-center gap-px">
          {waveformData.map((value, idx) => {
            const barProgress = idx / waveformData.length;
            const isPassed = barProgress <= progress;
            return (
              <div
                key={idx}
                className="flex-1 rounded-full pointer-events-none"
                style={{
                  height: `${Math.max(15, value * 100)}%`,
                  backgroundColor: isPassed ? progressColor : color,
                }}
              />
            );
          })}
        </div>

        {/* Playhead line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 pointer-events-none"
          style={{
            left: `${progress * 100}%`,
            backgroundColor: progressColor,
            opacity: 0.9,
          }}
        />
      </div>

      {/* Time display */}
      <div className="text-xs font-mono text-neutral-500 dark:text-neutral-400 flex-shrink-0 w-10 text-right">
        {formatTime(currentTime)}
      </div>
    </div>
  );
}
