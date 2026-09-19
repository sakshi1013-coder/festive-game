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

const PASTEL_OPTION_THEMES = [
  {
    // A → Pastel Pink
    base: 'bg-[#FDF0F0] border-[#F6C6C6] text-[#3D3542] hover:bg-[#FBE5E5] hover:border-[#E5989B]',
    selected: 'bg-[#F6C6C6] border-[#E5989B] text-[#3D3542] ring-2 ring-[#E5989B]/60 shadow-xs font-black',
    badge: 'bg-[#F6C6C6] text-[#3D3542] border-[#E5989B]',
  },
  {
    // B → Pastel Blue
    base: 'bg-[#F0F6FD] border-[#C9DDF5] text-[#3D3542] hover:bg-[#E3EFFB] hover:border-[#9EC1ED]',
    selected: 'bg-[#C9DDF5] border-[#9EC1ED] text-[#204068] ring-2 ring-[#9EC1ED]/60 shadow-xs font-black',
    badge: 'bg-[#C9DDF5] text-[#204068] border-[#9EC1ED]',
  },
  {
    // C → Pastel Mint
    base: 'bg-[#F1FAF3] border-[#CFE8D5] text-[#3D3542] hover:bg-[#E3F5E7] hover:border-[#A7D4B2]',
    selected: 'bg-[#CFE8D5] border-[#A7D4B2] text-[#1C4D32] ring-2 ring-[#A7D4B2]/60 shadow-xs font-black',
    badge: 'bg-[#CFE8D5] text-[#1C4D32] border-[#A7D4B2]',
  },
  {
    // D → Pastel Lavender
    base: 'bg-[#FAF4FC] border-[#E8D5F2] text-[#3D3542] hover:bg-[#F3E7F8] hover:border-[#D1ADE5]',
    selected: 'bg-[#E8D5F2] border-[#D1ADE5] text-[#44337A] ring-2 ring-[#D1ADE5]/60 shadow-xs font-black',
    badge: 'bg-[#E8D5F2] text-[#44337A] border-[#D1ADE5]',
  },
];

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
        <div className="p-4 bg-surface-secondary rounded-2xl border border-bappa-border text-sm leading-loose whitespace-pre-line text-bappa-text mb-4 text-center font-bold">
          {question.question}
        </div>
      )}

      <div className={`grid ${options.length === 2 ? 'grid-cols-2' : 'sm:grid-cols-2'} gap-3.5`}>
        {options.map((option, i) => {
          const theme = PASTEL_OPTION_THEMES[i % PASTEL_OPTION_THEMES.length];
          const isSelected = (picked === option || selectedAnswer === option);
          const isCorrect = option === correctAnswer;

          let cardStyle = `border-2 ${theme.base}`;

          if (revealed) {
            if (isCorrect) {
              // Soft green/mint success state
              cardStyle = 'border-2 border-[#4E9F6E] bg-[#EAF6EE] text-[#1C4D32] ring-2 ring-[#4E9F6E]/40 font-black shadow-xs';
            } else if (isSelected) {
              // Soft pastel red/pink state
              cardStyle = 'border-2 border-[#D86B6B] bg-[#FDF0F0] text-[#782828] font-bold';
            } else {
              cardStyle = 'border-2 border-bappa-border bg-surface/50 opacity-40';
            }
          } else if (isSelected) {
            cardStyle = `border-2 ${theme.selected}`;
          }

          return (
            <motion.button
              key={i}
              type="button"
              whileTap={{ scale: disabled || revealed ? 1 : 0.98 }}
              onClick={() => handleSelect(option)}
              disabled={disabled || revealed}
              className={`flex items-center justify-between p-3 sm:p-3.5 rounded-2xl text-left font-bold text-sm sm:text-base transition-all duration-200 cursor-pointer ${cardStyle} ${disabled && !isSelected ? 'cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-black flex-shrink-0 ${
                    revealed && isCorrect
                      ? 'bg-[#4E9F6E] text-white border-[#4E9F6E]'
                      : revealed && isSelected
                      ? 'bg-[#D86B6B] text-white border-[#D86B6B]'
                      : isSelected
                      ? theme.badge
                      : 'bg-surface border-bappa-border text-bappa-secondary'
                  }`}
                >
                  {options.length === 2 ? (i === 0 ? '✓' : '✗') : String.fromCharCode(65 + i)}
                </span>
                <span className="truncate">{option}</span>
              </div>
              {isSelected && (
                <CheckCircle2
                  className={`w-5 h-5 flex-shrink-0 ml-2 ${
                    revealed && isCorrect ? 'text-[#4E9F6E]' : 'text-primary'
                  }`}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
