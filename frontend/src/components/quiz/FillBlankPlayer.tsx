'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Send, Sparkles } from 'lucide-react';
import { DynamicQuizQuestion } from '@/types/index';

interface Props {
  question: DynamicQuizQuestion;
  onSubmit: (answer: string) => void;
  disabled?: boolean;
  revealed?: boolean;
  selectedAnswer?: string | null;
  correctAnswer?: string;
}

export default function FillBlankPlayer({
  question,
  onSubmit,
  disabled = false,
  revealed = false,
  selectedAnswer,
  correctAnswer,
}: Props) {
  const [picked, setPicked] = useState<string | null>(selectedAnswer || null);

  useEffect(() => {
    setPicked(selectedAnswer || null);
  }, [selectedAnswer, question?._id]);

  const handleSelect = (option: string) => {
    if (disabled || revealed) return;
    setPicked(option);
    onSubmit(option);
  };

  const options = question.options || [];

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Question Sentence with highlighted blank */}
      <div className="p-4 sm:p-5 bg-pastel-surface/80 rounded-2xl border border-pastel-border shadow-2xs text-center">
        <div className="text-lg sm:text-xl font-black text-bappa-text leading-relaxed whitespace-pre-line">
          {question.question.replace('______', picked ? `【 ${picked} 】` : '【 ______ 】')}
        </div>
      </div>

      {/* Options grid */}
      <div className="grid sm:grid-cols-2 gap-3">
        {options.map((option, i) => {
          let btnStyle = 'border-2 border-bappa-border bg-surface hover:border-primary hover:bg-primary-light';
          
          if (revealed) {
            if (option === correctAnswer) {
              btnStyle = 'border-2 border-success bg-success-light text-success font-bold';
            } else if (picked === option) {
              btnStyle = 'border-2 border-error bg-error-light text-error';
            } else {
              btnStyle = 'border-2 border-bappa-border bg-surface opacity-50';
            }
          } else if (picked === option) {
            btnStyle = 'border-2 border-primary bg-primary-light shadow-saffron';
          }

          return (
            <motion.button
              key={i}
              whileTap={{ scale: disabled || revealed ? 1 : 0.98 }}
              onClick={() => handleSelect(option)}
              disabled={disabled || revealed}
              className={`flex items-center justify-between px-5 py-4 rounded-xl text-left font-bold text-base transition-all duration-200 ${btnStyle}`}
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-surface-secondary border border-bappa-border text-xs flex items-center justify-center font-black text-bappa-muted">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="text-bappa-text">{option}</span>
              </div>
              {picked === option && <CheckCircle2 className="w-5 h-5 text-primary" />}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
