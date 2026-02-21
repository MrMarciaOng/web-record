"use client";

import { useRef, useState, useCallback } from "react";

export default function Home() {
  const [recording, setRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showMobileWarning, setShowMobileWarning] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);

  const isMobile = useCallback(() => {
    return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }, []);

  const startRecording = useCallback(async () => {
    if (isMobile()) {
      setShowMobileWarning(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm",
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setRecording(false);

        // Clean up tracks
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      // Stop recording if the user ends screen share via browser UI
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        if (mediaRecorder.state !== "inactive") {
          mediaRecorder.stop();
        }
      });

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setRecording(true);
      setVideoUrl(null);

      // Show live preview
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Failed to start screen recording:", err);
    }
  }, [isMobile]);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop(); // triggers onstop which cleans up tracks
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = null;
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Screen Recording POC
        </h1>

        {/* Recording Controls */}
        <div className="flex gap-3">
          <button
            onClick={startRecording}
            disabled={recording}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Start Recording
          </button>
          <button
            onClick={stopRecording}
            disabled={!recording}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Stop Recording
          </button>
          {recording && (
            <span className="flex items-center gap-2 text-sm text-red-500">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              Recording...
            </span>
          )}
        </div>

        {/* Live Preview */}
        {recording && (
          <div className="space-y-3">
            <h2 className="text-lg font-medium">Live Preview</h2>
            <video
              ref={liveVideoRef}
              autoPlay
              muted
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800"
            />
          </div>
        )}

        {/* Interactive Area — something to click around */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
          <h2 className="text-lg font-medium">Interactive Area</h2>
          <label className="block space-y-1">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Text Input (click around, type something)
            </span>
            <input
              type="text"
              placeholder="Type here while recording..."
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Another field
            </span>
            <textarea
              rows={3}
              placeholder="More text to interact with..."
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
        </div>

        {/* Video Playback & Download */}
        {videoUrl && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Recorded Video</h2>
            <video
              src={videoUrl}
              controls
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800"
            />
            <a
              href={videoUrl}
              download="screen-recording.webm"
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download Recording
            </a>
          </div>
        )}
        {/* Mobile Warning Popup */}
        {showMobileWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 w-full max-w-sm rounded-xl bg-white dark:bg-zinc-900 p-6 shadow-xl space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600 dark:text-red-400"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <h3 className="text-lg font-semibold">Not Supported</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Screen recording is not supported on mobile browsers. Please use a desktop browser to record your screen.
              </p>
              <button
                onClick={() => setShowMobileWarning(false)}
                className="w-full rounded-md bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
