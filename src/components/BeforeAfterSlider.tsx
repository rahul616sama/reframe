import { useCallback, useEffect, useRef, useState } from "react";

interface BeforeAfterSliderProps {
  /** The video element to use as the source for both sides */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** CSS filter string for the "after" (adjusted) side */
  filterStyle: string;
  /** Width of the preview container in px */
  width: number;
  /** Height of the preview container in px */
  height: number;
}

/**
 * BeforeAfterSlider
 *
 * Renders a split-view overlay on top of a video preview.
 * Left side shows the original frame; right side shows the colour-adjusted frame.
 * A draggable (and keyboard-accessible) vertical divider lets the user scrub between the two.
 *
 * Implementation notes
 * ────────────────────
 * • Uses two <canvas> elements drawn from the same <video> source each animation frame.
 * • The "before" canvas is always drawn without filters.
 * • The "after" canvas uses the CSS filter string via CanvasRenderingContext2D.filter.
 * • The clip region is updated via CSS clip-path so no pixel-copying is needed.
 */
export default function BeforeAfterSlider({
  videoRef,
  filterStyle,
  width,
  height,
}: BeforeAfterSliderProps) {
  const [dividerX, setDividerX] = useState(width / 2);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const beforeCanvasRef = useRef<HTMLCanvasElement>(null);
  const afterCanvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  // Keep divider centred when width changes (e.g. responsive resize)
  useEffect(() => {
    setDividerX((prev) => {
      const ratio = prev / (width || 1);
      return ratio * width;
    });
  }, [width]);

  // ── Render loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    const beforeCtx = beforeCanvasRef.current?.getContext("2d");
    const afterCtx = afterCanvasRef.current?.getContext("2d");
    if (!video || !beforeCtx || !afterCtx) return;

    const draw = () => {
      if (video.readyState >= 2) {
        // Before – no filter
        beforeCtx.filter = "none";
        beforeCtx.drawImage(video, 0, 0, width, height);

        // After – apply colour adjustments
        afterCtx.filter = filterStyle || "none";
        afterCtx.drawImage(video, 0, 0, width, height);
      }
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [videoRef, filterStyle, width, height]);

  // ── Drag helpers ─────────────────────────────────────────────────────────
  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

  const updateDividerFromClientX = useCallback(
    (clientX: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setDividerX(clamp(clientX - rect.left, 0, width));
    },
    [width]
  );

  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    e.preventDefault();
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging.current) updateDividerFromClientX(e.clientX);
    };
    const onMouseUp = () => {
      isDragging.current = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (isDragging.current)
        updateDividerFromClientX(e.touches[0].clientX);
    };
    const onTouchEnd = () => {
      isDragging.current = false;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [updateDividerFromClientX]);

  // ── Keyboard accessibility ───────────────────────────────────────────────
  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 20 : 4;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setDividerX((x) => clamp(x - step, 0, width));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setDividerX((x) => clamp(x + step, 0, width));
    }
  };

  const pct = `${(dividerX / (width || 1)) * 100}%`;

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        inset: 0,
        width,
        height,
        overflow: "hidden",
        userSelect: "none",
        cursor: "ew-resize",
      }}
      aria-label="Before/after comparison slider"
    >
      {/* ── BEFORE canvas (full width, left side) ── */}
      <canvas
        ref={beforeCanvasRef}
        width={width}
        height={height}
        style={{
          position: "absolute",
          inset: 0,
          clipPath: `inset(0 ${100 - (dividerX / width) * 100}% 0 0)`,
        }}
        aria-hidden
      />

      {/* ── AFTER canvas (full width, right side) ── */}
      <canvas
        ref={afterCanvasRef}
        width={width}
        height={height}
        style={{
          position: "absolute",
          inset: 0,
          clipPath: `inset(0 0 0 ${(dividerX / width) * 100}%)`,
        }}
        aria-hidden
      />

      {/* ── "Before" label ── */}
      <span
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          padding: "2px 8px",
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          background: "rgba(0,0,0,0.55)",
          color: "#fff",
          backdropFilter: "blur(4px)",
          pointerEvents: "none",
          opacity: dividerX > 40 ? 1 : 0,
          transition: "opacity 0.15s",
        }}
      >
        Before
      </span>

      {/* ── "After" label ── */}
      <span
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          padding: "2px 8px",
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          background: "rgba(0,0,0,0.55)",
          color: "#fff",
          backdropFilter: "blur(4px)",
          pointerEvents: "none",
          opacity: dividerX < width - 40 ? 1 : 0,
          transition: "opacity 0.15s",
        }}
      >
        After
      </span>

      {/* ── Divider line + handle ── */}
      <div
        role="slider"
        aria-label="Before/after comparison divider"
        aria-valuenow={Math.round((dividerX / width) * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        onMouseDown={onMouseDown}
        onTouchStart={(e) => {
          isDragging.current = true;
          updateDividerFromClientX(e.touches[0].clientX);
        }}
        onKeyDown={onKeyDown}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: pct,
          transform: "translateX(-50%)",
          width: 44,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          cursor: "ew-resize",
          outline: "none",
          zIndex: 10,
        }}
      >
        {/* Vertical rule */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 2,
            background:
              "linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.9) 8%, rgba(255,255,255,0.9) 92%, transparent 100%)",
            boxShadow: "0 0 6px rgba(0,0,0,0.5)",
          }}
        />

        {/* Circular handle */}
        <div
          style={{
            position: "relative",
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.95)",
            boxShadow:
              "0 2px 8px rgba(0,0,0,0.35), 0 0 0 2px rgba(255,255,255,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 3,
            flexShrink: 0,
          }}
        >
          {/* Left arrow chevron */}
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            style={{ flexShrink: 0 }}
          >
            <path
              d="M7 1L3 5l4 4"
              stroke="#111"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {/* Right arrow chevron */}
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            style={{ flexShrink: 0 }}
          >
            <path
              d="M3 1l4 4-4 4"
              stroke="#111"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
