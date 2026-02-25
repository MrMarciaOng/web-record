# Screen + Webcam Recorder

This web app lets users:
- Start screen recording from a laptop/desktop browser
- Capture webcam at the same time
- Record screen/share audio and microphone audio
- Choose where webcam appears on top of the screen recording
- Control webcam focus with size, zoom, and fit mode
- Download or share the final recorded video (`.webm`)
- Use a clean shadcn-style UI for all controls

## Build Plan

1. Recording capture
- Capture display media with `getDisplayMedia()`
- Capture webcam video with `getUserMedia()`

2. Video composition
- Render screen and webcam into a hidden `<canvas>`
- Keep webcam as picture-in-picture overlay on top of screen
- Let users switch overlay position: top-left, top-right, bottom-left, bottom-right

3. Recording output
- Convert canvas to stream with `canvas.captureStream()`
- Record with `MediaRecorder` and codec fallback
- Generate downloadable blob URL for playback and export

4. Sharing UX
- Add `Download Video` action
- Add `Share Video` action using Web Share API (with browser support checks)

5. Reliability and edge cases
- Stop recording if user ends screen share from browser controls
- Clean up all media tracks and animation frames
- Show permission/error states and mobile warning

## Current Status

Implemented in [src/app/page.tsx](/Users/marciaong/Documents/source-code/Personal/web-record/src/app/page.tsx):
- Screen + webcam recording pipeline
- Canvas compositing and live mixed preview
- Overlay position controls
- Download and share actions
- Mobile and permission handling

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Test Flow

1. Click `Start Recording`
2. Approve screen and camera permissions
3. Pick a camera position button
4. Click `Stop Recording`
5. Play back the video
6. Click `Download Video` or `Share Video`

## Browser Notes

- Best support: Chrome/Edge on desktop
- Safari and Firefox may have limitations for `MediaRecorder`, codecs, or file sharing
- Mobile browsers are not supported for this workflow
