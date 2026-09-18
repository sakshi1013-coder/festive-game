'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { DynamicQuizQuestion } from '@/types/index';

interface Props {
  question: DynamicQuizQuestion;
  onSubmit: (answer: string) => void;
  disabled?: boolean;
  revealed?: boolean;
  selectedAnswer?: string | null;
  correctAnswer?: string;
}

export default function StandardOptionsPlayer({
  question,
  onSubmit,
  disabled = false,
  revealed = false,
  selectedAnswer,
  correctAnswer,
}: Props) {
  const [picked, setPicked] = useState<string | null>(selectedAnswer || null);

  const handleSelect = (option: string) => {
    if (disabled || revealed) return;
    setPicked(option);
    onSubmit(option);
  };

  const options = question.options || [];

  return (
    <div className="space-y-4">
      {/* Context preview if missing line */}
      {question.type === 'missing_line' && (
        <div className="p-4 bg-surface-secondary rounded-xl border border-bappa-border font-mono text-sm leading-loose whitespace-pre-line text-bappa-text mb-4 text-center font-bold">
          {question.question}
        </div>
      )}

      <div className={`grid ${options.length === 2 ? 'grid-cols-2' : 'sm:grid-cols-2'} gap-3`}>
        {options.map((option, i) => {
          let cardStyle = 'border-2 border-bappa-border bg-surface hover:border-primary hover:bg-primary-light';

          if (revealed) {
            if (option === correctAnswer) {
              cardStyle = 'border-2 border-success bg-success-light text-success font-bold';
            } else if (picked === option) {
              cardStyle = 'border-2 border-error bg-error-light text-error';
            } else {
              cardStyle = 'border-2 border-bappa-border bg-surface opacity-50';
            }
          } else if (picked === option) {
            cardStyle = 'border-2 border-primary bg-primary-light shadow-saffron';
          }

          return (
            <motion.button
              key={i}
              whileTap={{ scale: disabled || revealed ? 1 : 0.98 }}
              onClick={() => handleSelect(option)}
              disabled={disabled || revealed}
              className={`flex items-center justify-between p-4 rounded-xl text-left font-bold text-base transition-all duration-200 ${cardStyle}`}
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-surface-secondary border border-bappa-border flex items-center justify-center text-xs font-black text-bappa-muted flex-shrink-0">
                  {options.length === 2 ? (i === 0 ? '✓' : '✗') : String.fromCharCode(65 + i)}
                </span>
                <span className="text-bappa-text font-bold">{option}</span>
              </div>
              {picked === option && <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
