import React from 'react';
import { BarChart3 } from 'lucide-react';

export interface SubjectChartItem {
  subject: string;
  scored: number;
  max: number;
  percentage: number;
  grade: string;
}

interface PerformanceBarGraphProps {
  items: SubjectChartItem[];
  examTitle: string;
}

// Distinct, vibrant colors for each subject
export const SUBJECT_DISTINCT_COLORS: Record<string, string> = {
  english: '#2563eb', // Royal Blue
  hindi: '#d97706', // Warm Amber / Orange
  urdu: '#059669', // Emerald Green
  sanskrit: '#7c3aed', // Purple
  mathematics: '#dc2626', // Crimson Red
  maths: '#dc2626',
  science: '#0891b2', // Deep Cyan / Teal
  'social studies': '#c026d3', // Magenta / Fuchsia
  sst: '#c026d3',
  'general knowledge': '#ea580c', // Vivid Tangerine
  gk: '#ea580c',
  'environmental studies': '#16a34a', // Leaf Green
  evs: '#16a34a',
  computer: '#4f46e5', // Indigo
  drawing: '#db2777', // Bright Pink
  islamiyat: '#047857', // Forest Green
  arabic: '#0284c7', // Sky Blue
};

// Fallback palette of high-contrast, distinct colors
export const DISTINCT_PALETTE = [
  '#2563eb', // Blue
  '#ea580c', // Tangerine
  '#059669', // Emerald
  '#dc2626', // Red
  '#7c3aed', // Purple
  '#0891b2', // Cyan
  '#c026d3', // Magenta
  '#d97706', // Amber
  '#16a34a', // Leaf Green
  '#4f46e5', // Indigo
  '#db2777', // Pink
  '#0f766e', // Deep Teal
];

// Returns a distinct color for each subject
export function getSubjectBarColor(subject: string, index: number): string {
  const key = subject.toLowerCase().trim();
  if (SUBJECT_DISTINCT_COLORS[key]) {
    return SUBJECT_DISTINCT_COLORS[key];
  }
  for (const [k, v] of Object.entries(SUBJECT_DISTINCT_COLORS)) {
    if (key.includes(k) || k.includes(key)) {
      return v;
    }
  }
  return DISTINCT_PALETTE[index % DISTINCT_PALETTE.length];
}

// Split subject name into clean, readable lines so text never joins or overflows
export function splitSubjectName(subject: string): string[] {
  const clean = subject.trim();
  const lower = clean.toLowerCase();

  if (lower === 'general knowledge') return ['General', 'Knowledge'];
  if (lower === 'social studies') return ['Social', 'Studies'];
  if (lower === 'environmental studies') return ['Env.', 'Studies'];
  if (lower === 'computer science') return ['Computer', 'Science'];
  if (lower === 'physical education') return ['Physical', 'Edu.'];
  if (lower.startsWith('mathemat')) return ['Maths'];

  // If single word longer than 7 characters, truncate cleanly
  if (clean.length > 7 && !clean.includes(' ')) {
    return [clean.slice(0, 6) + '.'];
  }

  // If multiple words, split
  const words = clean.split(/\s+/);
  if (words.length > 1) return words;

  return [clean];
}

export const PerformanceBarGraph: React.FC<PerformanceBarGraphProps> = ({ items, examTitle }) => {
  const yTicks = [100, 75, 50, 25, 0];

  return (
    <div className="my-1 p-1 sm:p-1.5 bg-white rounded-xs border border-[#1b4332]/40 font-sans shadow-2xs print:shadow-none print:my-0.5 print:p-1 print:border-[#1b4332]">
      {/* Header & Subtitle */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-0.5 mb-1 gap-1">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-[#1b4332]/10 flex items-center justify-center text-[#1b4332]">
            <BarChart3 className="w-2.5 h-2.5" />
          </div>
          <h4 className="text-[9.5px] font-bold text-[#1b4332] uppercase tracking-wider">
            Subject-wise Performance Graph — {examTitle}
          </h4>
        </div>
        
        {/* Graph Legend Indicator */}
        <div className="flex items-center gap-1 text-[7.5px] text-slate-500 font-semibold">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
          <span>Individual Subject Colors &bull; Scored % on Bars</span>
        </div>
      </div>

      {/* Vertical Column Chart Area */}
      <div className="relative">
        <div className="flex items-stretch">
          {/* Y-Axis scale labels */}
          <div className="w-4.5 shrink-0 flex flex-col justify-between text-[6px] font-mono font-bold text-slate-400 text-right pr-1 pb-5.5 h-11 select-none">
            {yTicks.map((tick) => (
              <span key={tick} className="leading-none">{tick}%</span>
            ))}
          </div>

          {/* Chart Plot Area with Grid Lines and Vertical Columns */}
          <div className="flex-1 relative overflow-x-auto overflow-y-hidden pb-0.5">
            {/* Horizontal Gridlines spanning chart background */}
            <div className="absolute inset-0 right-0 h-11 pointer-events-none flex flex-col justify-between border-b border-slate-300">
              <div className="w-full border-b border-slate-200 border-dashed"></div>
              <div className="w-full border-b border-slate-200 border-dashed"></div>
              <div className="w-full border-b border-slate-200 border-dashed"></div>
              <div className="w-full border-b border-slate-200 border-dashed"></div>
              <div className="w-full"></div>
            </div>

            {/* Vertical Subject Columns with distinct colors, compact width & small font */}
            <div className="relative z-10 flex items-end justify-around gap-1 sm:gap-1.5 px-0.5">
              {items.map((item, index) => {
                const pct = Math.min(100, Math.max(0, item.percentage));
                const barColor = getSubjectBarColor(item.subject, index);
                const subjectLines = splitSubjectName(item.subject);

                return (
                  <div 
                    key={item.subject} 
                    className="flex flex-col items-center flex-1 min-w-[34px] max-w-[54px] group"
                  >
                    {/* Top Value / Percentage Badge */}
                    <div className="h-2.5 flex items-center justify-center mb-0.5">
                      <span 
                        className="text-[6.5px] font-extrabold font-mono px-0.5 py-0.2 rounded-2xs leading-none shadow-2xs whitespace-nowrap"
                        style={{
                          backgroundColor: `${barColor}15`,
                          color: barColor,
                          border: `1px solid ${barColor}40`
                        }}
                      >
                        {pct}%
                      </span>
                    </div>

                    {/* Vertical Bar Track & Column Fill (Height 34px) */}
                    <div className="w-3.5 sm:w-4 h-8 bg-slate-100/90 rounded-t-2xs border-t border-x border-slate-300/80 relative flex flex-col justify-end overflow-hidden">
                      <div 
                        className="w-full rounded-t-2xs transition-all duration-300 relative flex items-center justify-center shadow-xs"
                        style={{ 
                          height: `${Math.max(pct, 6)}%`,
                          backgroundColor: barColor 
                        }}
                      >
                        {/* Subtle inner light reflection */}
                        <div className="absolute inset-0 bg-white/15 opacity-60"></div>
                      </div>
                    </div>

                    {/* Baseline Divider in Subject Color */}
                    <div 
                      className="w-full h-0.5 transition-colors"
                      style={{ backgroundColor: barColor }}
                    ></div>

                    {/* Subject Name Box - Reduced width (34-40px) and reduced font size (5.5-6px) */}
                    <div 
                      className="w-[34px] sm:w-[40px] mt-0.5 py-0.5 px-0.5 text-center rounded-2xs bg-slate-50 border border-slate-200/90 shadow-2xs flex flex-col items-center justify-center min-h-[17px] sm:min-h-[19px]"
                      style={{ borderTop: `2px solid ${barColor}` }}
                      title={item.subject}
                    >
                      {subjectLines.map((line, lIdx) => (
                        <span 
                          key={lIdx} 
                          className="block font-bold text-slate-800 text-[5.5px] sm:text-[6px] uppercase leading-[1.05] tracking-tight truncate max-w-full text-center"
                        >
                          {line}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
