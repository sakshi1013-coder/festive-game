'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { DynamicQuizQuestion } from '@/types/index';

interface Props {
  question: DynamicQuizQuestion;
  onSubmit: (sentence: string) => void;
  disabled?: boolean;
  revealed?: boolean;
  selectedSentence?: string | null;
  correctAnswer?: string;
}

export default function IncorrectSentencePlayer({
  question,
  onSubmit,
  disabled = false,
  revealed = false,
  selectedSentence,
  correctAnswer,
}: Props) {
  const [picked, setPicked] = useState<string | null>(selectedSentence || null);

  useEffect(() => {
    setPicked(selectedSentence || null);
  }, [selectedSentence, question?._id]);

  const handleSelect = (sentence: string) => {
    if (disabled || revealed) return;
    setPicked(sentence);
    onSubmit(sentence);
  };

  const options = question.options || [];

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="p-2.5 sm:p-3 bg-pastel-blue/30 rounded-2xl border border-pastel-blue/60 text-center">
        <p className="text-xs text-bappa-muted font-bold flex items-center justify-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <span>3 lines below are authentic verses and 1 line has an alteration. Select the <strong>incorrect line</strong>.</span>
        </p>
      </div>

      <div className="space-y-2.5">
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
              className={`w-full flex items-center justify-between p-4 rounded-xl text-left font-bold text-base transition-all duration-200 ${cardStyle}`}
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-surface-secondary border border-bappa-border flex items-center justify-center text-xs font-black text-bappa-muted flex-shrink-0">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="text-bappa-text text-base sm:text-lg">{option}</span>
              </div>
              {picked === option && <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
