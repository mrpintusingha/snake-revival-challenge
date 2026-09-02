import { ReactNode } from "react";
import type { Dir } from "@/lib/snake-engine";

/**
 * Positions are percentages of the phone photo's own box (public/phone/nokia-1100.jpg),
 * measured directly against the image pixels. Keep in sync if the photo changes.
 */
const SCREEN = { left: 15.5, top: 26.6, width: 73.3, height: 22.7 };
const UP = { left: 64.7, top: 52.5, width: 32.8, height: 6.9 };
const DOWN = { left: 64.7, top: 59.4, width: 32.8, height: 6.9 };
const LEFT = { left: 2.6, top: 73.4, width: 32.8, height: 6.4 };
const RIGHT = { left: 64.7, top: 73.4, width: 32.8, height: 6.4 };
const SELECT = { left: 37.1, top: 52.5, width: 27.6, height: 13.8 };

export function NokiaFrame({
  children,
  topContent,
  onDirection,
  onSelect,
}: {
  children: ReactNode;
  topContent?: ReactNode;
  /** Wires the phone's own D-pad (▲▼ keys, and 4/6 for ◀▶) to the game. Omit for a decorative frame. */
  onDirection?: ((dir: Dir) => void) | undefined;
  /** Wires the phone's center/OK key — used to continue past game over. */
  onSelect?: (() => void) | undefined;
}) {
  return (
    <div className="relative mx-auto w-full max-w-[300px] select-none">
      {topContent && <div className="mb-3">{topContent}</div>}

      <div className="relative" style={{ overflow: "hidden", borderRadius: "12% / 5%" }}>
        <img
          src="/phone/nokia-1100.jpg"
          alt="Nokia 1100 phone"
          className="block w-full h-auto"
          draggable={false}
        />

        <div className="absolute" style={pct(SCREEN)}>
          {children}
        </div>

        <Hotspot box={UP} label="Up" onPress={() => onDirection?.("up")} />
        <Hotspot box={DOWN} label="Down" onPress={() => onDirection?.("down")} />
        <Hotspot box={LEFT} label="Left" onPress={() => onDirection?.("left")} />
        <Hotspot box={RIGHT} label="Right" onPress={() => onDirection?.("right")} />
        <Hotspot box={SELECT} label="Select" onPress={() => onSelect?.()} />
      </div>
    </div>
  );
}

function pct(box: { left: number; top: number; width: number; height: number }) {
  return { left: `${box.left}%`, top: `${box.top}%`, width: `${box.width}%`, height: `${box.height}%` };
}

function Hotspot({
  box,
  label,
  onPress,
}: {
  box: { left: number; top: number; width: number; height: number };
  label: string;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      tabIndex={-1}
      onClick={onPress}
      className="absolute bg-transparent"
      style={pct(box)}
    />
  );
}
