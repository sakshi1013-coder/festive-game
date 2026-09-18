'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Send, Search } from 'lucide-react';
import { DynamicQuizQuestion } from '@/types/index';

interface Props {
  question: DynamicQuizQuestion;
  onSubmit: (word: string) => void;
  disabled?: boolean;
  revealed?: boolean;
  incorrectWord?: string;
  correctWord?: string;
}

export default function IncorrectWordPlayer({
  question,
  onSubmit,
  disabled = false,
  revealed = false,
  incorrectWord,
  correctWord,
}: Props) {
  const words = question.words && question.words.length > 0
    ? question.words
    : (question.sentence || '').split(/\s+/);

  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  const handleWordClick = (w: string) => {
    if (disabled || revealed) return;
    setSelectedWord(w);
    onSubmit(w);
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-surface-secondary rounded-xl border border-bappa-border text-center">
        <p className="text-xs text-bappa-muted font-medium flex items-center justify-center gap-1.5">
          <Search className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <span><strong>Instruction:</strong> Spot the subtly altered incorrect word in the verse below and click it.</span>
        </p>
      </div>

      {/* Interactive Sentence with Clickable Words */}
      <div className="p-6 sm:p-8 bg-surface rounded-2xl border-2 border-bappa-border shadow-sm text-center">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {words.map((w, idx) => {
            let chipStyle = 'bg-surface-secondary border-bappa-border text-bappa-text hover:border-primary hover:bg-primary-light';

            if (revealed) {
              if (w === incorrectWord) {
                chipStyle = 'bg-error-light border-error text-error font-black ring-2 ring-error/50';
              } else if (selectedWord === w) {
                chipStyle = 'bg-surface-secondary border-bappa-border opacity-50';
              } else {
                chipStyle = 'bg-surface-secondary border-bappa-border opacity-70';
              }
            } else if (selectedWord === w) {
              chipStyle = 'bg-primary-light border-primary text-primary font-black shadow-saffron ring-2 ring-primary/40';
            }

            return (
              <motion.button
                key={idx}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => handleWordClick(w)}
                disabled={disabled || revealed}
                className={`px-4 py-2.5 rounded-xl border-2 text-lg sm:text-xl font-bold transition-all ${chipStyle}`}
              >
                {w}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Answer feedback reveal */}
      {revealed && (
        <div className="p-4 rounded-xl border border-success/30 bg-success-light text-center">
          <div className="text-sm text-success font-black mb-1 flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Altered Word: <span className="underline">{incorrectWord}</span></span>
          </div>
          {correctWord && (
            <div className="text-xs text-bappa-text font-bold">
              Authentic Original Word: <strong className="text-primary text-sm">"{correctWord}"</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
