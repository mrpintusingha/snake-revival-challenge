import { forwardRef } from "react";
import { LcdScreen, LcdScreenRef } from "./LcdScreen";

export type PhoneRef = LcdScreenRef;

export const Phone = forwardRef<PhoneRef>((props, ref) => {
  return (
    <div className="relative mx-auto h-[600px] w-[300px] rounded-[40px] border-[16px] border-black bg-gray-800 shadow-2xl">
      <div className="absolute left-1/2 top-8 h-4 w-1/2 -translate-x-1/2 rounded-full bg-gray-900" />
      <div className="absolute left-1/2 top-[80px] h-[30px] w-[100px] -translate-x-1/2 rounded-md bg-gray-700" />
      <LcdScreen ref={ref} />
      <div className="absolute bottom-10 left-1/2 grid w-[220px] -translate-x-1/2 grid-cols-3 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-10 w-full rounded-md bg-gray-700" />
        ))}
      </div>
    </div>
  );
});

Phone.displayName = "Phone";
