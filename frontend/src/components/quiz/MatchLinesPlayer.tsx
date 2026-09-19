'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link2, Check, Send } from 'lucide-react';
import { DynamicQuizQuestion } from '@/types/index';

interface Props {
  question: DynamicQuizQuestion;
  onSubmit: (pairs: { left: string; right: string }[]) => void;
  disabled?: boolean;
  revealed?: boolean;
}

export default function MatchLinesPlayer({
  question,
  onSubmit,
  disabled = false,
  revealed = false,
}: Props) {
  const originalPairs = question.pairs || [];
  const leftItems = originalPairs.map((p) => p.left);
  // Shuffled right items
  const [rightItems, setRightItems] = useState(() => [...originalPairs.map((p) => p.right)].sort(() => 0.5 - Math.random()));

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({}); // left -> right
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const pairs = question.pairs || [];
    setRightItems([...pairs.map((p) => p.right)].sort(() => 0.5 - Math.random()));
    setSelectedLeft(null);
    setMatches({});
    setSubmitted(false);
  }, [question?._id]);

  const handleLeftClick = (left: string) => {
    if (disabled || revealed) return;
    setSelectedLeft(left);
  };

  const handleRightClick = (right: string) => {
    if (disabled || revealed || !selectedLeft) return;
    setMatches((prev) => ({
      ...prev,
      [selectedLeft]: right,
    }));
    setSelectedLeft(null);
  };

  const handleConfirmSubmit = () => {
    if (disabled || revealed) return;
    setSubmitted(true);
    const result = Object.entries(matches).map(([left, right]) => ({ left, right }));
    onSubmit(result);
  };

  const allPaired = leftItems.every((l) => matches[l]);

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="p-2 px-3 bg-pastel-blue/30 rounded-2xl border border-pastel-blue/60 text-center">
        <p className="text-[11px] sm:text-xs text-bappa-muted font-bold flex items-center justify-center gap-1.5">
          <Link2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <span>Click a line on the left, then click its continuation on the right.</span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
        {/* Left Column (Beginnings) */}
        <div className="space-y-2">
          <div className="text-[11px] font-black text-primary uppercase tracking-wider px-1">First Half (Part 1):</div>
          {leftItems.map((left, idx) => {
            const isSelected = selectedLeft === left;
            const pairedRight = matches[left];

            return (
              <motion.button
                key={idx}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => handleLeftClick(left)}
                disabled={disabled || revealed}
                className={`w-full p-2.5 sm:p-3 rounded-2xl text-left font-bold text-xs sm:text-sm border-2 transition-all ${
                  isSelected
                    ? 'border-primary bg-pastel-blue/60 text-bappa-text shadow-xs ring-2 ring-primary/40'
                    : pairedRight
                    ? 'border-pastel-mint-dark bg-pastel-mint/60 text-emerald-950 font-black'
                    : 'border-pastel-border bg-white hover:border-primary/60'
                }`}
              >
                <div className="text-bappa-text font-black leading-snug">{left}</div>
                {pairedRight && (
                  <div className="text-[11px] text-emerald-800 font-bold flex items-center gap-1 mt-0.5">
                    <Link2 className="w-3 h-3" /> {pairedRight}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Right Column (Continuations) */}
        <div className="space-y-2">
          <div className="text-[11px] font-black text-primary uppercase tracking-wider px-1">Second Half (Part 2):</div>
          {rightItems.map((right, idx) => {
            const isAssigned = Object.values(matches).includes(right);

            return (
              <motion.button
                key={idx}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => handleRightClick(right)}
                disabled={disabled || revealed || !selectedLeft}
                className={`w-full p-2.5 sm:p-3 rounded-2xl text-left font-bold text-xs sm:text-sm border-2 transition-all ${
                  isAssigned
                    ? 'border-pastel-border/60 bg-pastel-surface/80 text-bappa-muted opacity-60'
                    : selectedLeft
                    ? 'border-primary bg-pastel-blue/30 text-bappa-text hover:border-primary ring-1 ring-primary animate-pulse'
                    : 'border-pastel-border bg-white'
                }`}
              >
                <div className="text-bappa-text font-black leading-snug">{right}</div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {!revealed && (
        <button
          type="button"
          onClick={handleConfirmSubmit}
          disabled={disabled || submitted || !allPaired}
          className="btn-primary w-full py-2.5 sm:py-3 rounded-2xl flex items-center justify-center gap-2 text-xs sm:text-sm font-black shadow-pastel-sm disabled:opacity-40"
        >
          <Send className="w-3.5 h-3.5" /> Submit Matches ({Object.keys(matches).length}/{leftItems.length})
        </button>
      )}
    </div>
  );
}
