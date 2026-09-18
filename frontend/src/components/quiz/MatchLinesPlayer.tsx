'use client';

import { useState } from 'react';
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
  const [rightItems] = useState(() => [...originalPairs.map((p) => p.right)].sort(() => 0.5 - Math.random()));

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({}); // left -> right
  const [submitted, setSubmitted] = useState(false);

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
    <div className="space-y-6">
      <div className="p-3.5 bg-surface-secondary rounded-xl border border-bappa-border text-center">
        <p className="text-xs text-bappa-muted font-medium flex items-center justify-center gap-1.5">
          <Link2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <span><strong>Instruction:</strong> Click a verse line on the left, then select its matching continuation on the right.</span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Left Column (Beginnings) */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-primary px-1">First Half (Part 1):</div>
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
                className={`w-full p-4 rounded-xl text-left font-bold text-sm sm:text-base border-2 transition-all ${
                  isSelected
                    ? 'border-primary bg-primary-light text-primary shadow-saffron'
                    : pairedRight
                    ? 'border-gold bg-gold-light text-gold-dark'
                    : 'border-bappa-border bg-surface hover:border-primary'
                }`}
              >
                <div className="text-bappa-text font-black mb-1">{left}</div>
                {pairedRight && (
                  <div className="text-xs text-primary font-medium flex items-center gap-1">
                    <Link2 className="w-3 h-3" /> {pairedRight}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Right Column (Continuations) */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-primary px-1">Second Half (Part 2):</div>
          {rightItems.map((right, idx) => {
            const isAssigned = Object.values(matches).includes(right);

            return (
              <motion.button
                key={idx}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => handleRightClick(right)}
                disabled={disabled || revealed || !selectedLeft}
                className={`w-full p-4 rounded-xl text-left font-bold text-sm sm:text-base border-2 transition-all ${
                  isAssigned
                    ? 'border-gold/60 bg-surface-secondary text-bappa-text opacity-70'
                    : selectedLeft
                    ? 'border-primary/50 bg-surface hover:border-primary hover:bg-primary-light animate-pulse'
                    : 'border-bappa-border bg-surface'
                }`}
              >
                <div className="text-bappa-text font-black">{right}</div>
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
          className="btn-primary w-full shadow-saffron py-3.5 flex items-center justify-center gap-2 text-sm sm:text-base font-bold disabled:opacity-50"
        >
          <Send className="w-4 h-4" /> Submit Matches ({Object.keys(matches).length}/{leftItems.length})
        </button>
      )}
    </div>
  );
}
