"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Minimal ambient types so this compiles without @types/dom-speech-recognition.
type SpeechRecognitionResultLike = { transcript: string };

let cachedVoice: SpeechSynthesisVoice | null | undefined = undefined;

function pickBestBrowserVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice !== undefined) return cachedVoice;
  if (typeof window === "undefined" || !window.speechSynthesis) return null;

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  const preferredNamePatterns = [
    /Google US English/i,
    /Microsoft.*Online.*Natural/i,
    /Microsoft Aria/i,
    /Microsoft Guy/i,
    /Samantha/i,
    /Google UK English/i,
  ];

  for (const pattern of preferredNamePatterns) {
    const match = voices.find((v) => pattern.test(v.name) && v.lang.startsWith("en"));
    if (match) {
      cachedVoice = match;
      return match;
    }
  }

  const anyEnglish = voices.find((v) => v.lang.startsWith("en"));
  cachedVoice = anyEnglish || voices[0] || null;
  return cachedVoice;
}

export function useVoiceAgent() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stoppedRef = useRef(false);
  const interruptedRef = useRef(false);
  const pendingFinishRef = useRef<(() => void) | null>(null);
  const serverTtsAvailableRef = useRef(true); // flip false after first failure, so we don't retry a dead endpoint every turn

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const handler = () => {
      cachedVoice = undefined;
      pickBestBrowserVoice();
    };
    window.speechSynthesis.addEventListener("voiceschanged", handler);
    pickBestBrowserVoice();
    return () => window.speechSynthesis.removeEventListener("voiceschanged", handler);
  }, []);

  const isSupported = useMemo(() => {
    if (typeof window === "undefined") return false;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    return Boolean(SR); // speech-to-text (SpeechRecognition) is required; TTS has a server + browser fallback either way
  }, []);

  /** Splits text into sentence-sized chunks - only needed for the browser
   * speechSynthesis fallback, to dodge Chrome's ~15s auto-cutoff bug. Real
   * audio playback (server TTS) doesn't have that issue. */
  const splitIntoChunks = (text: string): string[] => {
    const sentences = text.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) || [text];
    const chunks: string[] = [];
    let current = "";
    for (const sentence of sentences) {
      if ((current + sentence).length > 160 && current) {
        chunks.push(current.trim());
        current = sentence;
      } else {
        current += sentence;
      }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks.length > 0 ? chunks : [text];
  };

  const speakOneBrowserUtterance = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !window.speechSynthesis || stoppedRef.current || interruptedRef.current) {
        resolve();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = pickBestBrowserVoice();
      if (voice) utterance.voice = voice;
      // Tiny natural variance so consecutive lines don't sound like the exact
      // same robotic cadence every single time.
      utterance.rate = 0.96 + Math.random() * 0.08;
      utterance.pitch = 0.98 + Math.random() * 0.08;
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (pendingFinishRef.current === finish) pendingFinishRef.current = null;
        resolve();
      };
      pendingFinishRef.current = finish;
      utterance.onend = finish;
      utterance.onerror = finish;
      window.speechSynthesis.speak(utterance);
    });
  };

  /** Fallback path: browser's built-in speechSynthesis. */
  const speakViaBrowser = async (text: string): Promise<void> => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const keepAlive = setInterval(() => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 5000);

    try {
      for (const chunk of splitIntoChunks(text)) {
        if (stoppedRef.current || interruptedRef.current) break;
        await speakOneBrowserUtterance(chunk);
      }
    } finally {
      clearInterval(keepAlive);
    }
  };

  /** Preferred path: free neural TTS (edge-tts) via our backend. No API key,
   * genuinely natural voices. Returns false (instead of throwing) on any
   * failure so the caller can fall back to the browser voice seamlessly. */
  const speakViaServer = async (text: string, mode: string): Promise<boolean> => {
    if (!serverTtsAvailableRef.current) return false;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, mode }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        serverTtsAvailableRef.current = false;
        return false;
      }
      const blob = await res.blob();
      if (blob.size === 0 || stoppedRef.current || interruptedRef.current) return false;

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          if (pendingFinishRef.current === finish) pendingFinishRef.current = null;
          resolve();
        };
        pendingFinishRef.current = finish;
        audio.onended = finish;
        audio.onerror = () => {
          if (settled) return;
          settled = true;
          if (pendingFinishRef.current === finish) pendingFinishRef.current = null;
          reject(new Error("audio playback failed"));
        };
        audio.play().catch(reject);
      });

      URL.revokeObjectURL(url);
      audioRef.current = null;
      return true;
    } catch {
      return false;
    }
  };

  /** Speak text out loud and resolve once finished. Tries free neural TTS
   * first; transparently falls back to the browser voice if that's ever
   * unavailable (offline, blocked, etc.) so voice always works either way. */
  const speak = useCallback(async (text: string, mode: string = "interview"): Promise<void> => {
    if (typeof window === "undefined" || stoppedRef.current || !text.trim()) return;

    setIsSpeaking(true);
    try {
      const playedByServer = await speakViaServer(text, mode);
      if (playedByServer || stoppedRef.current || interruptedRef.current) return;
      await speakViaBrowser(text);
    } finally {
      setIsSpeaking(false);
    }
  }, []);

  /** Immediately cuts off whatever the AI is currently saying (server audio
   * or browser speechSynthesis) so the candidate can jump straight to
   * answering, without waiting for the AI to finish the line.
   *
   * This is intentionally a MANUAL interrupt (triggered by a button in the
   * UI) rather than automatic microphone-based detection. An automatic
   * "listen for the candidate's voice while the AI is still talking"
   * approach sounds nice in theory, but the Web Speech API gives us no way
   * to apply real echo cancellation - so on any setup without headphones,
   * the mic simply hears the AI's own voice coming out of the speakers and
   * mistakes it for the candidate interrupting, causing the AI to cut
   * itself off almost immediately on every single question. A manual
   * button is far less "magic" but it's the reliable version of this
   * feature - it never fires by accident and never eats the candidate's
   * turn to answer. */
  const interrupt = useCallback(() => {
    interruptedRef.current = true;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    // Unblock whatever `speak()` promise is currently awaiting playback.
    if (pendingFinishRef.current) {
      const finish = pendingFinishRef.current;
      pendingFinishRef.current = null;
      finish();
    }
    setIsSpeaking(false);
  }, []);

  /**
   * Listen for a single spoken answer and resolve with the transcript.
   * Resolves with "" if unsupported, cancelled, or nothing was heard.
   */
  const listen = useCallback((timeoutMs = 20000): Promise<string> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || stoppedRef.current) {
        resolve("");
        return;
      }
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) {
        resolve("");
        return;
      }

      const recognition = new SR();
      recognitionRef.current = recognition;
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      let settled = false;
      const finish = (text: string) => {
        if (settled) return;
        settled = true;
        setIsListening(false);
        clearTimeout(timer);
        try {
          recognition.stop();
        } catch {
          /* no-op */
        }
        resolve(text);
      };

      const timer = setTimeout(() => finish(""), timeoutMs);

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const result: SpeechRecognitionResultLike = event.results[0][0];
        finish(result.transcript.trim());
      };
      recognition.onerror = () => finish("");
      recognition.onend = () => finish("");

      const start = (retriesLeft: number) => {
        try {
          recognition.start();
        } catch {
          // Most likely cause: the previous recognition session hadn't
          // fully released the mic yet. Give the browser a brief moment and
          // try again instead of silently giving up and skipping the
          // candidate's turn.
          if (retriesLeft > 0 && !settled) {
            setTimeout(() => start(retriesLeft - 1), 250);
          } else {
            finish("");
          }
        }
      };
      start(2);
    });
  }, []);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    interruptedRef.current = true;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (pendingFinishRef.current) {
      const finish = pendingFinishRef.current;
      pendingFinishRef.current = null;
      finish();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* no-op */
      }
    }
    setIsSpeaking(false);
    setIsListening(false);
  }, []);

  const reset = useCallback(() => {
    stoppedRef.current = false;
    interruptedRef.current = false;
    serverTtsAvailableRef.current = true; // give the server another chance on a fresh call
  }, []);

  return {
    speak,
    interrupt,
    listen,
    stop,
    reset,
    isSpeaking,
    isListening,
    isSupported,
  };
}
