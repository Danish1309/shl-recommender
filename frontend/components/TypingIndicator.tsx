"use client";

export default function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 px-4 py-2">
      {/* SHL icon */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-shl-blue flex items-center justify-center text-white text-xs font-bold">
        SHL
      </div>
      {/* Dots */}
      <div className="bg-shl-surface border border-shl-border rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        <div className="typing-dot"></div>
        <div className="typing-dot"></div>
        <div className="typing-dot"></div>
      </div>
    </div>
  );
}
