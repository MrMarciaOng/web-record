"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Circle, Download, Monitor, Share2, Video } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type OverlayPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

type WebcamFitMode = "cover" | "contain";
type WebcamShape =
  | "rectangle"
  | "oval"
  | "oval-tall"
  | "circle"
  | "squircle"
  | "diamond";

const WEBCAM_SHAPE_OPTIONS: { label: string; value: WebcamShape }[] = [
  { label: "Rectangle", value: "rectangle" },
  { label: "Oval Wide", value: "oval" },
  { label: "Oval Tall", value: "oval-tall" },
  { label: "Circle", value: "circle" },
  { label: "Squircle", value: "squircle" },
  { label: "Diamond", value: "diamond" },
];

const OVERLAY_OPTIONS: { label: string; value: OverlayPosition }[] = [
  { label: "Top Left", value: "top-left" },
  { label: "Top Right", value: "top-right" },
  { label: "Bottom Left", value: "bottom-left" },
  { label: "Bottom Right", value: "bottom-right" },
];

function waitForVideoReady(video: HTMLVideoElement) {
  return new Promise<void>((resolve) => {
    if (video.readyState >= 2) {
      resolve();
      return;
    }

    const onReady = () => {
      video.removeEventListener("loadedmetadata", onReady);
      resolve();
    };

    video.addEventListener("loadedmetadata", onReady);
  });
}

function getSupportedRecorderMimeType() {
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];

  for (const mimeType of candidates) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  return "";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getShapeAspectRatio(shape: WebcamShape) {
  if (shape === "oval-tall") {
    return 9 / 16;
  }

  if (shape === "circle" || shape === "squircle" || shape === "diamond") {
    return 1;
  }

  return 16 / 9;
}

export default function Home() {
  const [recording, setRecording] = useState(false);
  const [overlayPosition, setOverlayPosition] =
    useState<OverlayPosition>("bottom-right");
  const [overlayScale, setOverlayScale] = useState(24);
  const [webcamZoom, setWebcamZoom] = useState(1);
  const [webcamPanX, setWebcamPanX] = useState(0);
  const [webcamPanY, setWebcamPanY] = useState(0);
  const [webcamFitMode, setWebcamFitMode] = useState<WebcamFitMode>("cover");
  const [webcamShape, setWebcamShape] = useState<WebcamShape>("rectangle");
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [mockPreviewEnabled, setMockPreviewEnabled] = useState(false);
  const [mockPreviewError, setMockPreviewError] = useState<string | null>(null);
  const [showMobileWarning, setShowMobileWarning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const overlayPositionRef = useRef<OverlayPosition>(overlayPosition);
  const overlayScaleRef = useRef(overlayScale);
  const webcamZoomRef = useRef(webcamZoom);
  const webcamPanXRef = useRef(webcamPanX);
  const webcamPanYRef = useRef(webcamPanY);
  const webcamFitModeRef = useRef<WebcamFitMode>(webcamFitMode);
  const webcamShapeRef = useRef<WebcamShape>(webcamShape);

  const chunksRef = useRef<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const mixedStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mockPreviewStreamRef = useRef<MediaStream | null>(null);

  const screenVideoElementRef = useRef<HTMLVideoElement | null>(null);
  const webcamVideoElementRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const livePreviewRef = useRef<HTMLVideoElement | null>(null);
  const mockPreviewVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    overlayPositionRef.current = overlayPosition;
  }, [overlayPosition]);

  useEffect(() => {
    overlayScaleRef.current = overlayScale;
  }, [overlayScale]);

  useEffect(() => {
    webcamZoomRef.current = webcamZoom;
  }, [webcamZoom]);
  useEffect(() => {
    webcamPanXRef.current = webcamPanX;
  }, [webcamPanX]);
  useEffect(() => {
    webcamPanYRef.current = webcamPanY;
  }, [webcamPanY]);

  useEffect(() => {
    webcamFitModeRef.current = webcamFitMode;
  }, [webcamFitMode]);
  useEffect(() => {
    webcamShapeRef.current = webcamShape;
  }, [webcamShape]);

  const isMobile = useCallback(() => {
    return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }, []);

  const stopTracks = (stream: MediaStream | null) => {
    stream?.getTracks().forEach((track) => track.stop());
  };

  const stopMockPreview = useCallback(() => {
    stopTracks(mockPreviewStreamRef.current);
    mockPreviewStreamRef.current = null;
    setMockPreviewEnabled(false);
    if (mockPreviewVideoRef.current) {
      mockPreviewVideoRef.current.srcObject = null;
    }
  }, []);

  const startMockPreview = useCallback(async () => {
    try {
      setMockPreviewError(null);
      if (mockPreviewStreamRef.current) {
        setMockPreviewEnabled(true);
        return;
      }

      const previewStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      mockPreviewStreamRef.current = previewStream;
      setMockPreviewEnabled(true);
    } catch (error) {
      setMockPreviewError(
        "Could not start webcam preview. Please allow camera permission."
      );
      console.error(error);
    }
  }, []);

  useEffect(() => {
    if (!mockPreviewEnabled) {
      return;
    }

    const previewVideo = mockPreviewVideoRef.current;
    const previewStream = mockPreviewStreamRef.current;

    if (!previewVideo || !previewStream) {
      return;
    }

    previewVideo.srcObject = previewStream;
    previewVideo.play().catch(() => {
      setMockPreviewError("Could not autoplay preview. Click Start Mock Preview again.");
    });
  }, [mockPreviewEnabled]);

  const clearDrawLoop = () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const cleanupStreams = useCallback(() => {
    clearDrawLoop();

    stopTracks(screenStreamRef.current);
    stopTracks(webcamStreamRef.current);
    stopTracks(mixedStreamRef.current);
    audioContextRef.current?.close();

    screenStreamRef.current = null;
    webcamStreamRef.current = null;
    mixedStreamRef.current = null;
    audioContextRef.current = null;

    if (livePreviewRef.current) {
      livePreviewRef.current.srcObject = null;
    }
  }, []);

  const drawCompositeFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const screenVideo = screenVideoElementRef.current;
    const webcamVideo = webcamVideoElementRef.current;

    if (!canvas || !screenVideo || !webcamVideo) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const render = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);

      const padding = Math.max(12, Math.round(canvas.width * 0.015));
      const shape = webcamShapeRef.current;
      const shapeAspectRatio = getShapeAspectRatio(shape);
      const maxOverlayWidth = Math.max(100, canvas.width - padding * 2);
      const requestedOverlayWidth = Math.round(
        canvas.width * (overlayScaleRef.current / 100)
      );
      let overlayWidth = clamp(requestedOverlayWidth, 100, maxOverlayWidth);
      let overlayHeight = Math.round(overlayWidth / shapeAspectRatio);
      const maxOverlayHeight = Math.max(100, canvas.height - padding * 2);
      if (overlayHeight > maxOverlayHeight) {
        overlayHeight = maxOverlayHeight;
        overlayWidth = Math.round(overlayHeight * shapeAspectRatio);
      }

      let x = canvas.width - overlayWidth - padding;
      let y = canvas.height - overlayHeight - padding;

      switch (overlayPositionRef.current) {
        case "top-left":
          x = padding;
          y = padding;
          break;
        case "top-right":
          x = canvas.width - overlayWidth - padding;
          y = padding;
          break;
        case "bottom-left":
          x = padding;
          y = canvas.height - overlayHeight - padding;
          break;
        case "bottom-right":
          x = canvas.width - overlayWidth - padding;
          y = canvas.height - overlayHeight - padding;
          break;
      }

      const maxX = Math.max(padding, canvas.width - overlayWidth - padding);
      const maxY = Math.max(padding, canvas.height - overlayHeight - padding);
      x = clamp(x, padding, maxX);
      y = clamp(y, padding, maxY);

      context.fillStyle = "rgba(8, 10, 18, 0.2)";
      context.fillRect(x - 4, y - 4, overlayWidth + 8, overlayHeight + 8);

      const webcamWidth = webcamVideo.videoWidth || 1280;
      const webcamHeight = webcamVideo.videoHeight || 720;
      const zoom = webcamZoomRef.current;
      const panXFactor = webcamPanXRef.current / 100;
      const panYFactor = webcamPanYRef.current / 100;

      const croppedSourceWidth = webcamWidth / zoom;
      const croppedSourceHeight = webcamHeight / zoom;
      const panRoomX = webcamWidth - croppedSourceWidth;
      const panRoomY = webcamHeight - croppedSourceHeight;
      const cropX = clamp(
        (webcamWidth - croppedSourceWidth) / 2 + panXFactor * (panRoomX / 2),
        0,
        webcamWidth - croppedSourceWidth
      );
      const cropY = clamp(
        (webcamHeight - croppedSourceHeight) / 2 + panYFactor * (panRoomY / 2),
        0,
        webcamHeight - croppedSourceHeight
      );
      const sourceAspect = croppedSourceWidth / croppedSourceHeight;
      const frameAspect = overlayWidth / overlayHeight;

      if (shape !== "rectangle") {
        context.save();
        context.beginPath();
        if (shape === "oval" || shape === "oval-tall" || shape === "circle") {
          const radiusX = shape === "circle" ? Math.min(overlayWidth, overlayHeight) / 2 : overlayWidth / 2;
          const radiusY = shape === "circle" ? Math.min(overlayWidth, overlayHeight) / 2 : overlayHeight / 2;
          context.ellipse(
            x + overlayWidth / 2,
            y + overlayHeight / 2,
            radiusX,
            radiusY,
            0,
            0,
            Math.PI * 2
          );
        } else if (shape === "diamond") {
          context.moveTo(x + overlayWidth / 2, y);
          context.lineTo(x + overlayWidth, y + overlayHeight / 2);
          context.lineTo(x + overlayWidth / 2, y + overlayHeight);
          context.lineTo(x, y + overlayHeight / 2);
          context.closePath();
        } else {
          const squircleRadius = Math.min(overlayWidth, overlayHeight) * 0.3;
          context.roundRect(x, y, overlayWidth, overlayHeight, squircleRadius);
        }
        context.clip();
      }

      if (webcamFitModeRef.current === "cover") {
        let sx = cropX;
        let sy = cropY;
        let sw = croppedSourceWidth;
        let sh = croppedSourceHeight;

        if (sourceAspect > frameAspect) {
          sw = croppedSourceHeight * frameAspect;
          sx = cropX + (croppedSourceWidth - sw) / 2;
        } else if (sourceAspect < frameAspect) {
          sh = croppedSourceWidth / frameAspect;
          sy = cropY + (croppedSourceHeight - sh) / 2;
        }

        context.drawImage(
          webcamVideo,
          sx,
          sy,
          sw,
          sh,
          x,
          y,
          overlayWidth,
          overlayHeight
        );
      } else {
        let drawWidth = overlayWidth;
        let drawHeight = overlayHeight;
        let drawX = x;
        let drawY = y;

        if (sourceAspect > frameAspect) {
          drawHeight = overlayWidth / sourceAspect;
          drawY = y + (overlayHeight - drawHeight) / 2;
        } else if (sourceAspect < frameAspect) {
          drawWidth = overlayHeight * sourceAspect;
          drawX = x + (overlayWidth - drawWidth) / 2;
        }

        context.fillStyle = "rgba(0, 0, 0, 0.35)";
        context.fillRect(x, y, overlayWidth, overlayHeight);

        context.drawImage(
          webcamVideo,
          cropX,
          cropY,
          croppedSourceWidth,
          croppedSourceHeight,
          drawX,
          drawY,
          drawWidth,
          drawHeight
        );
      }

      if (shape !== "rectangle") {
        context.restore();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();
  }, []);

  const startRecording = useCallback(async () => {
    if (isMobile()) {
      setShowMobileWarning(true);
      return;
    }

    setErrorMessage(null);

    try {
      const [screenStream, webcamStream] = await Promise.all([
        navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 30, max: 30 } },
          audio: true,
        }),
        navigator.mediaDevices.getUserMedia({
          video: true,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        }),
      ]);

      screenStreamRef.current = screenStream;
      webcamStreamRef.current = webcamStream;
      chunksRef.current = [];

      const screenVideo = document.createElement("video");
      screenVideo.srcObject = screenStream;
      screenVideo.muted = true;
      screenVideo.playsInline = true;

      const webcamVideo = document.createElement("video");
      webcamVideo.srcObject = webcamStream;
      webcamVideo.muted = true;
      webcamVideo.playsInline = true;

      screenVideoElementRef.current = screenVideo;
      webcamVideoElementRef.current = webcamVideo;

      await Promise.all([
        waitForVideoReady(screenVideo),
        waitForVideoReady(webcamVideo),
      ]);

      await Promise.all([screenVideo.play(), webcamVideo.play()]);

      const canvas = canvasRef.current;
      if (!canvas) {
        throw new Error("Missing render surface.");
      }

      canvas.width = screenVideo.videoWidth || 1920;
      canvas.height = screenVideo.videoHeight || 1080;

      drawCompositeFrame();

      const mixedVideoStream = canvas.captureStream(30);
      const mixedStream = new MediaStream();
      mixedVideoStream
        .getVideoTracks()
        .forEach((track) => mixedStream.addTrack(track));

      const audioContext = new AudioContext();
      await audioContext.resume();
      audioContextRef.current = audioContext;

      const destination = audioContext.createMediaStreamDestination();

      if (screenStream.getAudioTracks().length > 0) {
        const screenAudioSource = audioContext.createMediaStreamSource(
          new MediaStream(screenStream.getAudioTracks())
        );
        screenAudioSource.connect(destination);
      }

      if (webcamStream.getAudioTracks().length > 0) {
        const micAudioSource = audioContext.createMediaStreamSource(
          new MediaStream(webcamStream.getAudioTracks())
        );
        micAudioSource.connect(destination);
      }

      destination.stream
        .getAudioTracks()
        .forEach((track) => mixedStream.addTrack(track));

      mixedStreamRef.current = mixedStream;

      const mimeType = getSupportedRecorderMimeType();
      const mediaRecorder = mimeType
        ? new MediaRecorder(mixedStream, { mimeType })
        : new MediaRecorder(mixedStream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);

        if (recordedVideoUrl) {
          URL.revokeObjectURL(recordedVideoUrl);
        }

        setRecordedBlob(blob);
        setRecordedVideoUrl(url);
        setRecording(false);
        cleanupStreams();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);

      if (livePreviewRef.current) {
        livePreviewRef.current.srcObject = mixedStream;
      }

      screenStream.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (mediaRecorder.state !== "inactive") {
          mediaRecorder.stop();
        }
      });

      setRecording(true);
      setRecordedBlob(null);
      setRecordedVideoUrl(null);
    } catch (error) {
      cleanupStreams();
      setRecording(false);
      setErrorMessage(
        "Could not start recording. Please allow screen, camera, and microphone permissions."
      );
      console.error(error);
    }
  }, [cleanupStreams, drawCompositeFrame, isMobile, recordedVideoUrl]);

  const stopRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;

    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      return;
    }

    cleanupStreams();
    setRecording(false);
  }, [cleanupStreams]);

  const shareRecording = useCallback(async () => {
    if (!recordedBlob) {
      return;
    }

    if (!navigator.share || !navigator.canShare) {
      setErrorMessage(
        "Sharing is not supported in this browser. Download the recording and share the file manually."
      );
      return;
    }

    const file = new File([recordedBlob], "screen-share-recording.webm", {
      type: "video/webm",
    });

    if (!navigator.canShare({ files: [file] })) {
      setErrorMessage(
        "This browser cannot share video files directly. Please download and share the file manually."
      );
      return;
    }

    try {
      await navigator.share({
        title: "Screen recording",
        files: [file],
      });
    } catch (error) {
      const isAbortError =
        error instanceof DOMException && error.name === "AbortError";
      if (!isAbortError) {
        setErrorMessage("Sharing failed. Please download and share manually.");
      }
    }
  }, [recordedBlob]);

  useEffect(() => {
    return () => {
      cleanupStreams();
      stopMockPreview();
      if (recordedVideoUrl) {
        URL.revokeObjectURL(recordedVideoUrl);
      }
    };
  }, [cleanupStreams, recordedVideoUrl, stopMockPreview]);

  return (
    <main className="min-h-screen p-5 text-slate-900 md:p-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="space-y-2">
          <Badge className="uppercase tracking-[0.14em]">Screen + Webcam Recorder</Badge>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            One place to record, customize, and share videos fast
          </h1>
          <p className="max-w-3xl text-sm text-slate-600 md:text-base">
            Capture screen, camera, and audio together. Tip: enable tab audio in
            the browser sharing dialog if you want system or tab sound.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Mock Live Share Preview</CardTitle>
            <CardDescription>
              Preview exactly how your webcam placement will look on a shared
              screen before you start recording.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative aspect-video overflow-hidden rounded-xl border border-sky-100 bg-white">
              <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-white to-orange-50" />
              <div className="absolute left-4 right-4 top-4 flex h-10 items-center justify-between rounded-lg border border-slate-200 bg-white/90 px-4 shadow-sm">
                <span className="text-sm font-semibold text-slate-700">
                  Product Demo Meeting
                </span>
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                  Live
                </span>
              </div>
              <div className="absolute bottom-4 left-4 w-[42%] rounded-lg border border-slate-200 bg-white/95 p-3 shadow-sm">
                <p className="text-xs font-semibold text-slate-700">Notes</p>
                <p className="mt-1 text-xs text-slate-500">
                  Walk through the onboarding flow and pricing update.
                </p>
              </div>
              <div className="absolute bottom-4 right-4 w-[36%] rounded-lg border border-slate-200 bg-white/95 p-3 shadow-sm">
                <p className="text-xs font-semibold text-slate-700">Chat</p>
                <p className="mt-1 text-xs text-slate-500">
                  &quot;Looks good, can you zoom on the chart?&quot;
                </p>
              </div>

              {mockPreviewEnabled ? (
                <div
                  className={`absolute overflow-hidden border border-sky-200 bg-black shadow-[0_12px_30px_rgba(14,55,130,0.25)] ${
                    webcamShape === "rectangle"
                      ? "rounded-lg"
                      : webcamShape === "squircle"
                        ? "rounded-[30%]"
                        : "rounded-[999px]"
                  }`}
                  style={{
                    width: `${overlayScale}%`,
                    aspectRatio: getShapeAspectRatio(webcamShape),
                    clipPath:
                      webcamShape === "diamond"
                        ? "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)"
                        : undefined,
                    top:
                      overlayPosition === "top-left" || overlayPosition === "top-right"
                        ? "4%"
                        : undefined,
                    bottom:
                      overlayPosition === "bottom-left" ||
                      overlayPosition === "bottom-right"
                        ? "4%"
                        : undefined,
                    left:
                      overlayPosition === "top-left" ||
                      overlayPosition === "bottom-left"
                        ? "3%"
                        : undefined,
                    right:
                      overlayPosition === "top-right" ||
                      overlayPosition === "bottom-right"
                        ? "3%"
                        : undefined,
                  }}
                >
                  <video
                    ref={mockPreviewVideoRef}
                    autoPlay
                    muted
                    playsInline
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: webcamFitMode,
                      transform: `scale(${webcamZoom})`,
                      transformOrigin: `${50 + webcamPanX / 2}% ${50 + webcamPanY / 2}%`,
                    }}
                  />
                </div>
              ) : (
                <div className="absolute bottom-4 right-4 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700">
                  Enable webcam preview to see your camera overlay
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {mockPreviewEnabled ? (
                <Button variant="outline" onClick={stopMockPreview}>
                  <Monitor />
                  Stop Mock Preview
                </Button>
              ) : (
                <Button variant="secondary" onClick={startMockPreview}>
                  <Monitor />
                  Start Mock Preview
                </Button>
              )}
              <span className="text-sm text-slate-500">
                Camera uses your current size, zoom, position, and fit settings.
              </span>
            </div>

            {mockPreviewError && <Alert>{mockPreviewError}</Alert>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recorder Controls</CardTitle>
            <CardDescription>
              Pick your camera layout, then start recording.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={startRecording} disabled={recording}>
                <Video />
                Start Recording
              </Button>
              <Button
                onClick={stopRecording}
                disabled={!recording}
                variant="destructive"
              >
                <Circle />
                Stop Recording
              </Button>
              {recording ? (
                <Badge className="border-rose-200 bg-rose-50 text-rose-700">
                  Recording live
                </Badge>
              ) : (
                <Badge className="border-slate-200 bg-slate-100 text-slate-700">
                  Recorder idle
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Camera position</p>
              <ToggleGroup
                type="single"
                value={overlayPosition}
                onValueChange={(value) => {
                  if (value) {
                    setOverlayPosition(value as OverlayPosition);
                  }
                }}
                className="grid grid-cols-2 gap-2 md:grid-cols-4"
                aria-label="Camera position"
              >
                {OVERLAY_OPTIONS.map((option) => (
                  <ToggleGroupItem
                    key={option.value}
                    value={option.value}
                    aria-label={option.label}
                  >
                    {option.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">Webcam size</span>
                  <span className="text-slate-500">{overlayScale}%</span>
                </div>
                <Slider
                  value={[overlayScale]}
                  min={15}
                  max={45}
                  step={1}
                  onValueChange={(value) => setOverlayScale(value[0] ?? 24)}
                  aria-label="Webcam size"
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">Webcam zoom</span>
                  <span className="text-slate-500">{webcamZoom.toFixed(1)}x</span>
                </div>
                <Slider
                  value={[webcamZoom]}
                  min={1}
                  max={2.5}
                  step={0.1}
                  onValueChange={(value) => setWebcamZoom(value[0] ?? 1)}
                  aria-label="Webcam zoom"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">Crop left/right</span>
                  <span className="text-slate-500">
                    {webcamPanX === 0
                      ? "center"
                      : webcamPanX > 0
                        ? `${webcamPanX}% right`
                        : `${Math.abs(webcamPanX)}% left`}
                  </span>
                </div>
                <Slider
                  value={[webcamPanX]}
                  min={-100}
                  max={100}
                  step={1}
                  onValueChange={(value) => setWebcamPanX(value[0] ?? 0)}
                  aria-label="Webcam horizontal crop"
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">Crop up/down</span>
                  <span className="text-slate-500">
                    {webcamPanY === 0
                      ? "center"
                      : webcamPanY > 0
                        ? `${webcamPanY}% down`
                        : `${Math.abs(webcamPanY)}% up`}
                  </span>
                </div>
                <Slider
                  value={[webcamPanY]}
                  min={-100}
                  max={100}
                  step={1}
                  onValueChange={(value) => setWebcamPanY(value[0] ?? 0)}
                  aria-label="Webcam vertical crop"
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Webcam fit mode</p>
              <ToggleGroup
                type="single"
                value={webcamFitMode}
                onValueChange={(value) => {
                  if (value) {
                    setWebcamFitMode(value as WebcamFitMode);
                  }
                }}
                aria-label="Webcam fit mode"
              >
                <ToggleGroupItem value="cover" aria-label="Cover mode">
                  Cover (crop edges)
                </ToggleGroupItem>
                <ToggleGroupItem value="contain" aria-label="Contain mode">
                  Contain (show full camera)
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Webcam shape</p>
              <ToggleGroup
                type="single"
                value={webcamShape}
                onValueChange={(value) => {
                  if (value) {
                    setWebcamShape(value as WebcamShape);
                  }
                }}
                className="grid grid-cols-2 gap-2 md:grid-cols-5"
                aria-label="Webcam shape"
              >
                {WEBCAM_SHAPE_OPTIONS.map((shapeOption) => (
                  <ToggleGroupItem
                    key={shapeOption.value}
                    value={shapeOption.value}
                    aria-label={`${shapeOption.label} shape`}
                  >
                    {shapeOption.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <p className="text-xs text-slate-500">
                Samples: Rectangle, Oval, Circle, Squircle, Diamond.
              </p>
            </div>

            {errorMessage && <Alert>{errorMessage}</Alert>}
          </CardContent>
        </Card>

        {recording && (
          <Card>
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
              <CardDescription>
                This is the exact video being generated right now.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <video
                ref={livePreviewRef}
                autoPlay
                muted
                playsInline
                className="aspect-video w-full rounded-lg border border-sky-100 bg-black"
              />
            </CardContent>
          </Card>
        )}

        {recordedVideoUrl && (
          <Card>
            <CardHeader>
              <CardTitle>Recorded Output</CardTitle>
              <CardDescription>
                Review your recording, then download or share.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <video
                src={recordedVideoUrl}
                controls
                className="aspect-video w-full rounded-lg border border-sky-100 bg-black"
              />
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <a href={recordedVideoUrl} download="screen-share-recording.webm">
                    <Download />
                    Download Video
                  </a>
                </Button>
                <Button onClick={shareRecording} variant="outline">
                  <Share2 />
                  Share Video
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {showMobileWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Desktop only</CardTitle>
              <CardDescription>
                Screen capture is not reliable on mobile browsers. Please use a
                laptop or desktop browser.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => setShowMobileWarning(false)}>
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
