"use client";

import { ChatMessage } from "@/lib/types";
import RecommendationCard from "./RecommendationCard";

interface MessageBubbleProps {
  message: ChatMessage;
}

function SHLIcon() {
  return (
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-shl-blue flex items-center justify-center text-white text-xs font-bold">
      SHL
    </div>
  );
}

function UserIcon() {
  return (
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-shl-surface-2 border border-shl-border flex items-center justify-center">
      <svg
        className="w-4 h-4 text-shl-text-secondary"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
      </svg>
    </div>
  );
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const hasRecs =
    message.recommendations && message.recommendations.length > 0;

  if (isUser) {
    return (
      <div className="message-enter flex justify-end px-4 py-2">
        <div className="flex items-end gap-2 max-w-[75%]">
          <div className="bg-shl-blue rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-white leading-relaxed">
            {message.content}
          </div>
          <UserIcon />
        </div>
      </div>
    );
  }

  return (
    <div className="message-enter flex items-start gap-3 px-4 py-2">
      <SHLIcon />
      <div className="flex-1 min-w-0 space-y-3">
        {/* Reply text */}
        <div className="bg-shl-surface border border-shl-border rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-shl-text-primary leading-relaxed">
          {message.content}
        </div>

        {/* Recommendation cards */}
        {hasRecs && (
          <div className="space-y-2">
            <p className="text-xs text-shl-text-muted font-medium uppercase tracking-wider px-1">
              {message.recommendations!.length} Assessment
              {message.recommendations!.length > 1 ? "s" : ""} Recommended
            </p>
            <div className="grid gap-2">
              {message.recommendations!.map((rec, idx) => (
                <RecommendationCard key={rec.url} rec={rec} index={idx} />
              ))}
            </div>
          </div>
        )}

        {/* End of conversation badge */}
        {message.end_of_conversation && (
          <div className="flex items-center gap-2 px-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
            <span className="text-xs text-emerald-400 font-medium">
              Assessment shortlist confirmed
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
