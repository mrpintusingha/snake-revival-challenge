import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { cn } from "@/lib/utils";

export interface LcdScreenRef {
  getCanvas: () => HTMLCanvasElement | null;
}

export const LcdScreen = forwardRef<LcdScreenRef>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
  }));

  return (
    <div className="absolute left-1/2 top-1/2 h-[150px] w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-md bg-green-900 p-2 shadow-inner">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
});

LcdScreen.displayName = "LcdScreen";
