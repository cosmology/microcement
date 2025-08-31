"use client";

interface DebugInfoProps {
  cameraPos: number[];
  scrollTop: number;
  scrollHeight: number;
  progress: number;
  progressPercent: number;
  windowHeight: number;
  windowWidth: number;
  currentSection: string;
  sceneStage: number;
  introCompleted: boolean;
  withIntro: boolean;
}

export default function DebugInfo({
  cameraPos,
  scrollTop,
  scrollHeight,
  progress,
  progressPercent,
  windowHeight,
  windowWidth,
  currentSection,
  sceneStage,
  introCompleted,
  withIntro
}: DebugInfoProps) {
  return (
    <div
      style={{
        position: "fixed",
        top: "10px",
        left: "10px",
        background: "rgba(0,0,0,0.9)",
        color: "hsl(var(--foreground))",
        padding: "12px",
        borderRadius: "6px",
        zIndex: 10000,
        fontSize: "12px",
        lineHeight: "1.4",
        fontFamily: "monospace",
        minWidth: "200px",
        border: "1px solid rgba(255,255,255,0.2)"
      }}
    >
      <div><strong>Camera Position:</strong></div>
      <div>X: {cameraPos[0].toFixed(2)}</div>
      <div>Y: {cameraPos[1].toFixed(2)}</div>
      <div>Z: {cameraPos[2].toFixed(2)}</div>
      <div style={{marginTop: "8px"}}><strong>Scroll Info:</strong></div>
      <div>Top: {scrollTop.toFixed(2)}px</div>
      <div>Height: {scrollHeight}px</div>
      <div>Progress: {progressPercent.toFixed(2)}%</div>
      <div style={{marginTop: "8px"}}><strong>Window:</strong></div>
      <div>Width: {windowWidth}px</div>
      <div>Height: {windowHeight}px</div>
      <div style={{marginTop: "8px"}}><strong>Current Section:</strong></div>
      <div>{currentSection}</div>
      <div style={{marginTop: "8px"}}><strong>Scene Stage:</strong></div>
      <div>{sceneStage}</div>
      <div style={{marginTop: "8px"}}><strong>Intro Status:</strong></div>
      <div>Completed: {introCompleted ? 'Yes' : 'No'}</div>
      <div>With Intro: {withIntro ? 'Yes' : 'No'}</div>
    </div>
  );
} 