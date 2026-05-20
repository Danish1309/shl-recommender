"use client";

import { Recommendation, TEST_TYPE_LABELS, TEST_TYPE_COLORS } from "@/lib/types";

interface RecommendationCardProps {
  rec: Recommendation;
  index: number;
}

function TypeBadge({ typeCode }: { typeCode: string }) {
  const codes = typeCode.split(",").map((c) => c.trim());

  return (
    <div className="flex flex-wrap gap-1">
      {codes.map((code) => (
        <span
          key={code}
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
            TEST_TYPE_COLORS[code] ||
            "bg-gray-500/20 text-gray-300 border-gray-500/30"
          }`}
        >
          <span className="font-mono mr-1">{code}</span>
          <span className="text-[10px] opacity-80">
            {TEST_TYPE_LABELS[code] || ""}
          </span>
        </span>
      ))}
    </div>
  );
}

export default function RecommendationCard({
  rec,
  index,
}: RecommendationCardProps) {
  return (
    <div
      className="rec-card group flex items-start gap-3 bg-shl-surface border border-shl-border rounded-xl p-4 hover:border-shl-blue/50 cursor-pointer"
      onClick={() => window.open(rec.url, "_blank", "noopener,noreferrer")}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Index number */}
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-shl-blue/10 border border-shl-blue/20 flex items-center justify-center text-xs font-semibold text-shl-blue">
        {index + 1}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium text-shl-text-primary leading-snug group-hover:text-white transition-colors line-clamp-2">
            {rec.name}
          </h4>
          {/* External link icon */}
          <svg
            className="flex-shrink-0 w-3.5 h-3.5 text-shl-text-muted mt-0.5 group-hover:text-shl-blue transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </div>

        <div className="mt-2">
          <TypeBadge typeCode={rec.test_type} />
        </div>
      </div>
    </div>
  );
}
