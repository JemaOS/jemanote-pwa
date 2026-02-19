// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import { Square, Play, Pause, Check } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface VoiceRecorderProps {
  readonly onTranscriptChange: (transcript: string) => void;
  readonly initialTranscript?: string;
  readonly onSave?: (blob: Blob, duration: number) => void;
}

export default function VoiceRecorder({
  onTranscriptChange,
  initialTranscript = '',
  onSave,
}: VoiceRecorderProps) {
  const [transcript, setTranscript] = useState(initialTranscript);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [recordingWaveform, setRecordingWaveform] = useState<number[]>([]);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const playbackAnimationFrameRef = useRef<number | null>(null);
  const waveformContainerRef = useRef<HTMLDivElement | null>(null);

  // Démarrage automatique au montage
  useEffect(() => {
    startRecording();
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error(e);
        }
      }
      if (mediaRecorderRef.current?.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          console.error(e);
        }
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (playbackAnimationFrameRef.current) {
        cancelAnimationFrame(playbackAnimationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    interface SpeechRecognitionInterface {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      onresult: ((event: unknown) => void) | null;
      onerror: ((event: unknown) => void) | null;
      onend: (() => void) | null;
      start: () => void;
      stop: () => void;
    }
    interface SpeechRecognitionConstructor {
      new (): SpeechRecognitionInterface;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'fr-FR';

    recognition.onresult = (event: any) => {
      let interimText = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += `${transcriptPart} `;
        } else {
          interimText += transcriptPart;
        }
      }

      if (finalText) {
        const newTranscript = transcript + finalText;
        setTranscript(newTranscript);
        onTranscriptChange(newTranscript);
        setInterimTranscript('');
      } else {
        setInterimTranscript(interimText);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        try {
          recognition.start();
        } catch (e) {
          console.error(e);
        }
      }
    };

    recognition.onend = () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        try {
          recognition.start();
        } catch (e) {
          console.error(e);
        }
      }
    };

    recognitionRef.current = recognition;
  }, [transcript, onTranscriptChange]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      console.log('Stream audio obtenu:', stream.getAudioTracks()[0].getSettings());

      // Vérifier les formats supportés
      const supportedTypes = [
        'audio/webm',
        'audio/webm;codecs=opus',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/wav',
      ];

      let selectedType = 'audio/webm';
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedType = type;
          console.log('Format audio sélectionné:', type);
          break;
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedType,
        audioBitsPerSecond: 128000,
      });

      console.log('MediaRecorder créé avec:', mediaRecorder.mimeType);

      // Analyser audio pour waveform
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = event => {
        console.log('Chunk audio reçu:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('Arrêt enregistrement - nombre de chunks:', audioChunksRef.current.length);
        console.log(
          'Taille totale:',
          audioChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0),
          'bytes'
        );

        // Essayer différents types MIME pour compatibilité
        const mimeType = mediaRecorder.mimeType || 'audio/webm';

        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log('Audio blob créé:', blob.size, 'bytes, type:', mimeType);

        if (blob.size === 0) {
          console.error('ERREUR: Le blob audio est vide! Aucune donnée enregistrée.');
          alert('Erreur: Aucun audio enregistré. Vérifiez que votre microphone fonctionne.');
          return;
        }

        setAudioBlob(blob);
        setIsRecording(false);
        stream.getTracks().forEach(track => {
          console.log('Arrêt du track:', track.label);
          track.stop();
        });

        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        // Générer waveform depuis le blob
        generateWaveformFromBlob(blob);
      };

      mediaRecorder.start(100); // Capturer des chunks toutes les 100ms
      console.log('Enregistrement démarré');
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          console.log('Reconnaissance vocale démarrée');
        } catch (e) {
          console.log('Erreur démarrage reconnaissance:', e);
        }
      }

      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Démarrer visualisation waveform
      visualizeRecording();
    } catch (error) {
      console.error('Erreur accès microphone:', error);
      alert("Impossible d'accéder au microphone. Vérifiez les permissions.");
      setIsSupported(false);
    }
  };

  const visualizeRecording = () => {
    if (!analyserRef.current) {
      return;
    }

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isRecording) {
        return;
      }

      analyserRef.current!.getByteFrequencyData(dataArray);

      // Moyenne des fréquences pour une barre
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      const normalized = average / 255;

      setRecordingWaveform(prev => {
        const newWaveform = [...prev, normalized];
        return newWaveform.slice(-100); // Garder 100 dernières valeurs
      });

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  const generateWaveformFromBlob = async (blob: Blob) => {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const rawData = audioBuffer.getChannelData(0);
      const samples = 100;
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
      setAudioDuration(audioBuffer.duration);

      audioContext.close();
    } catch (error) {
      console.error('Erreur génération waveform:', error);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error(e);
      }
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsRecording(false);
  };

  const updatePlaybackProgress = () => {
    if (audioRef.current) {
      setAudioCurrentTime(audioRef.current.currentTime);
      playbackAnimationFrameRef.current = requestAnimationFrame(updatePlaybackProgress);
    }
  };

  const playAudio = () => {
    if (!audioBlob) {
      return;
    }

    // Si l'audio existe déjà, juste le reprendre
    if (audioRef.current) {
      audioRef.current
        .play()
        .then(() => {
          updatePlaybackProgress();
        })
        .catch(err => {
          console.error('Erreur lecture:', err);
        });
      return;
    }

    // Créer un nouvel élément audio
    const url = URL.createObjectURL(audioBlob);
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.ontimeupdate = () => {
      setAudioCurrentTime(audio.currentTime);
    };
    audio.onloadedmetadata = () => {
      setAudioDuration(audio.duration);
    };
    audio.onplay = () => {
      setIsPlayingAudio(true);
      updatePlaybackProgress();
    };
    audio.onended = () => {
      setIsPlayingAudio(false);
      setAudioCurrentTime(0);
      if (playbackAnimationFrameRef.current) {
        cancelAnimationFrame(playbackAnimationFrameRef.current);
      }
    };
    audio.onpause = () => {
      setIsPlayingAudio(false);
      if (playbackAnimationFrameRef.current) {
        cancelAnimationFrame(playbackAnimationFrameRef.current);
      }
    };

    audio.play().catch(err => {
      console.error('Erreur lecture:', err);
    });
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      if (playbackAnimationFrameRef.current) {
        cancelAnimationFrame(playbackAnimationFrameRef.current);
      }
    }
  };

  const handleWaveformClick = (index: number) => {
    if (!audioBlob || waveformData.length === 0) {
      return;
    }

    // Initialiser l'audio s'il n'existe pas encore
    if (!audioRef.current) {
      const url = URL.createObjectURL(audioBlob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.ontimeupdate = () => {
        setAudioCurrentTime(audio.currentTime);
      };
      audio.onloadedmetadata = () => {
        if (audio.duration && Number.isFinite(audio.duration)) {
          setAudioDuration(audio.duration);
        }
      };
      audio.onplay = () => {
        setIsPlayingAudio(true);
        updatePlaybackProgress();
      };
      audio.onended = () => {
        setIsPlayingAudio(false);
        setAudioCurrentTime(0);
        if (playbackAnimationFrameRef.current) {
          cancelAnimationFrame(playbackAnimationFrameRef.current);
        }
      };
      audio.onpause = () => {
        setIsPlayingAudio(false);
        if (playbackAnimationFrameRef.current) {
          cancelAnimationFrame(playbackAnimationFrameRef.current);
        }
      };
    }

    // Mettre à jour la durée si disponible sur l'élément audio
    if (
      audioRef.current.duration &&
      Number.isFinite(audioRef.current.duration) &&
      audioRef.current.duration !== audioDuration
    ) {
      setAudioDuration(audioRef.current.duration);
    }

    const currentDuration =
      audioRef.current.duration && Number.isFinite(audioRef.current.duration)
        ? audioRef.current.duration
        : audioDuration;

    const percentage = index / waveformData.length;
    const newTime = percentage * currentDuration;

    audioRef.current.currentTime = newTime;
    setAudioCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Fonction pour nettoyer l'affichage de la transcription (masquer les codes d'attachement)
  // SECURITY FIX: Added length limits to prevent ReDoS attacks
  const getDisplayTranscript = (text: string) => {
    const MAX_TEXT_LENGTH = 100000; // 100KB max
    const safeText = text.length > MAX_TEXT_LENGTH ? text.substring(0, MAX_TEXT_LENGTH) : text;
    return safeText.replaceAll(/!\[[^\]]{0,200}\]\(attachment:[a-zA-Z0-9-_]{1,100}\)/g, '').trim();
  };

  if (!isSupported) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          La reconnaissance vocale n'est pas supportée. Veuillez utiliser Chrome, Edge ou Safari et
          autoriser le microphone.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Contrôles d'enregistrement */}
      {isRecording && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 sm:gap-0 p-4 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20 rounded-xl border border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between sm:justify-start gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <div className="absolute inset-0 h-3 w-3 rounded-full bg-red-500 animate-ping" />
              </div>
              <span className="text-lg font-mono font-bold text-red-600 dark:text-red-400">
                {formatTime(recordingTime)}
              </span>
            </div>
          </div>

          {/* Waveform temps réel */}
          <div className="flex-1 mx-0 sm:mx-4 h-12 flex items-center gap-0.5 bg-white dark:bg-neutral-900 rounded-lg px-2 w-full">
            {recordingWaveform.length === 0 ? (
              <div className="flex-1 text-center text-sm text-neutral-400">
                Parlez dans le micro...
              </div>
            ) : (
              recordingWaveform.map((value, i) => (
                <div
                  key={`waveform-${value}-${i}`}
                  className="flex-1 bg-red-400 dark:bg-red-500 rounded-full transition-all"
                  style={{ height: `${Math.max(4, value * 100)}%` }}
                />
              ))
            )}
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={stopRecording}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all shadow-lg hover:shadow-xl text-sm font-semibold whitespace-nowrap"
            >
              <Square className="h-4 w-4 fill-white" />
              <span>Arrêter</span>
            </button>
          </div>
        </div>
      )}

      {/* Transcription */}
      {(getDisplayTranscript(transcript) || interimTranscript) && (
        <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl">
          <h3 className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 mb-3 uppercase tracking-wide">
            Transcription
          </h3>
          <div className="text-base text-neutral-900 dark:text-neutral-100 leading-relaxed">
            {getDisplayTranscript(transcript)}
            {interimTranscript && (
              <span className="text-neutral-400 dark:text-neutral-500 italic">
                {interimTranscript}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Lecteur audio avec waveform style Apple */}
      {audioBlob && waveformData.length > 0 && (
        <div className="p-5 bg-gradient-to-br from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <h3 className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">
                Mémo vocal
              </h3>
              <span className="text-xs text-neutral-400">
                ({(audioBlob.size / 1024).toFixed(1)} KB)
              </span>
            </div>
            <span className="text-sm font-mono font-semibold text-neutral-600 dark:text-neutral-400">
              {formatTime(audioCurrentTime)} / {formatTime(audioDuration)}
            </span>
          </div>

          {/* Waveform interactive style Apple avec drag */}
          <div
            ref={waveformContainerRef}
            className="relative py-2 cursor-pointer select-none"
            role="button"
            tabIndex={0}
            aria-label="Waveform player"
            onKeyDown={e => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                const newTime = Math.max(0, audioCurrentTime - 5);
                if (audioRef.current) {
                  audioRef.current.currentTime = newTime;
                }
                setAudioCurrentTime(newTime);
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                const newTime = Math.min(audioDuration, audioCurrentTime + 5);
                if (audioRef.current) {
                  audioRef.current.currentTime = newTime;
                }
                setAudioCurrentTime(newTime);
              }
            }}
            onMouseDown={e => {
              e.preventDefault();
              const container = waveformContainerRef.current;
              if (!container) {
                return;
              }

              const handleMove = (moveEvent: MouseEvent) => {
                moveEvent.preventDefault();
                const rect = container.getBoundingClientRect();
                const x = Math.max(0, Math.min(moveEvent.clientX - rect.left, rect.width));
                const percentage = x / rect.width;
                const index = Math.floor(percentage * waveformData.length);
                handleWaveformClick(Math.max(0, Math.min(index, waveformData.length - 1)));
              };

              const handleUp = () => {
                document.removeEventListener('mousemove', handleMove);
                document.removeEventListener('mouseup', handleUp);
              };

              document.addEventListener('mousemove', handleMove);
              document.addEventListener('mouseup', handleUp);

              // Clic initial
              const rect = container.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const percentage = x / rect.width;
              const index = Math.floor(percentage * waveformData.length);
              handleWaveformClick(Math.max(0, Math.min(index, waveformData.length - 1)));
            }}
            onTouchStart={e => {
              e.preventDefault();
              const container = waveformContainerRef.current;
              if (!container) {
                return;
              }

              const handleMove = (moveEvent: TouchEvent) => {
                moveEvent.preventDefault();
                const rect = container.getBoundingClientRect();
                const x = Math.max(
                  0,
                  Math.min(moveEvent.touches[0].clientX - rect.left, rect.width)
                );
                const percentage = x / rect.width;
                const index = Math.floor(percentage * waveformData.length);
                handleWaveformClick(Math.max(0, Math.min(index, waveformData.length - 1)));
              };

              const handleEnd = () => {
                document.removeEventListener('touchmove', handleMove);
                document.removeEventListener('touchend', handleEnd);
              };

              document.addEventListener('touchmove', handleMove);
              document.addEventListener('touchend', handleEnd);

              // Touch initial
              const rect = container.getBoundingClientRect();
              const x = e.touches[0].clientX - rect.left;
              const percentage = x / rect.width;
              const index = Math.floor(percentage * waveformData.length);
              handleWaveformClick(Math.max(0, Math.min(index, waveformData.length - 1)));
            }}
          >
            <div className="flex items-center h-20 w-full gap-px">
              {waveformData.map((value, index) => {
                const progress = audioDuration > 0 ? audioCurrentTime / audioDuration : 0;
                const isPassed = index / waveformData.length <= progress;

                return (
                  <div
                    key={`waveform-sample-${value}-${index}`}
                    className="flex-1 transition-all pointer-events-none rounded-full"
                    style={{
                      height: `${Math.max(8, value * 100)}%`,
                      backgroundColor: isPassed ? '#5a63e9' : 'rgb(212, 212, 212)',
                    }}
                  />
                );
              })}
            </div>

            {/* Ligne de lecture */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-primary-600 pointer-events-none"
              style={{
                left: `${audioDuration > 0 ? (audioCurrentTime / audioDuration) * 100 : 0}%`,
              }}
            />
          </div>

          {/* Contrôles de lecture */}
          <div className="flex flex-col items-center gap-4 pt-2">
            <div className="flex justify-center">
              {!isPlayingAudio ? (
                <button
                  onClick={playAudio}
                  className="flex items-center justify-center w-14 h-14 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-all shadow-lg hover:shadow-xl hover:scale-105"
                  title="Lire"
                >
                  <Play className="h-6 w-6 ml-0.5 fill-white" />
                </button>
              ) : (
                <button
                  onClick={pauseAudio}
                  className="flex items-center justify-center w-14 h-14 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-all shadow-lg hover:shadow-xl hover:scale-105"
                  title="Pause"
                >
                  <Pause className="h-6 w-6 fill-white" />
                </button>
              )}
            </div>

            {onSave && (
              <button
                onClick={() => {
                  onSave(audioBlob, audioDuration);
                }}
                className="w-full py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Enregistrer le mémo
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
