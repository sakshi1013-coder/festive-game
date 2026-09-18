'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, GripVertical, Check, Send, Lightbulb, CheckCircle2 } from 'lucide-react';
import { DynamicQuizQuestion } from '@/types/index';

interface Props {
  question: DynamicQuizQuestion;
  onSubmit: (orderedItems: string[]) => void;
  disabled?: boolean;
  revealed?: boolean;
  correctOrder?: string[];
}

export default function ArrangeAartiPlayer({
  question,
  onSubmit,
  disabled = false,
  revealed = false,
  correctOrder,
}: Props) {
  const initialItems = question.items && question.items.length > 0 ? question.items : [];
  const [items, setItems] = useState<string[]>(initialItems);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const moveItem = (fromIdx: number, toIdx: number) => {
    if (disabled || revealed || toIdx < 0 || toIdx >= items.length) return;
    const newItems = [...items];
    const [moved] = newItems.splice(fromIdx, 1);
    newItems.splice(toIdx, 0, moved);
    setItems(newItems);
  };

  const handleDragStart = (idx: number) => {
    if (disabled || revealed) return;
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx || disabled || revealed) return;
    moveItem(draggedIdx, idx);
    setDraggedIdx(idx);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
  };

  const handleConfirmSubmit = () => {
    if (disabled || revealed || submitted) return;
    setSubmitted(true);
    onSubmit(items);
  };

  return (
    <div className="space-y-6">
      <div className="text-center p-3 bg-surface-secondary rounded-xl border border-bappa-border">
        <p className="text-xs text-bappa-muted font-medium flex items-center justify-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <span><strong>Instruction:</strong> Arrange the words in the authentic order by dragging or using the arrow buttons.</span>
        </p>
      </div>

      {/* Word Items Stack */}
      <div className="space-y-2.5">
        {items.map((word, idx) => {
          let cardStyle = 'border-2 border-bappa-border bg-surface hover:border-primary';

          if (revealed && correctOrder) {
            const isCorrectPosition = correctOrder[idx] === word;
            cardStyle = isCorrectPosition
              ? 'border-2 border-success bg-success-light text-success font-bold'
              : 'border-2 border-error bg-error-light text-error';
          }

          return (
            <motion.div
              key={`${word}-${idx}`}
              layout
              draggable={!disabled && !revealed}
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e: any) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={`flex items-center justify-between p-3.5 sm:p-4 rounded-xl shadow-sm transition-all select-none ${cardStyle} ${
                !disabled && !revealed ? 'cursor-grab active:cursor-grabbing' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-secondary border border-bappa-border flex items-center justify-center font-black text-sm text-primary">
                  {idx + 1}
                </div>
                <GripVertical className="w-4 h-4 text-bappa-muted hidden sm:block" />
                <span className="text-base sm:text-lg font-bold text-bappa-text">{word}</span>
              </div>

              {/* Mobile Up/Down controls */}
              {!revealed && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => moveItem(idx, idx - 1)}
                    disabled={idx === 0 || disabled}
                    className="p-2 rounded-lg bg-surface-secondary border border-bappa-border hover:bg-primary-light hover:text-primary disabled:opacity-30 transition-colors"
                    title="Move Up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(idx, idx + 1)}
                    disabled={idx === items.length - 1 || disabled}
                    className="p-2 rounded-lg bg-surface-secondary border border-bappa-border hover:bg-primary-light hover:text-primary disabled:opacity-30 transition-colors"
                    title="Move Down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
              )}

              {revealed && correctOrder && (
                <div className="text-xs font-bold px-2 py-1 rounded">
                  {correctOrder[idx] === word ? 'Correct' : `Expected: ${correctOrder[idx]}`}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Formed line preview */}
      <div className="p-4 bg-primary-light/40 border border-primary/20 rounded-xl text-center">
        <div className="text-xs text-primary font-bold mb-1">Your Arranged Line:</div>
        <div className="text-base sm:text-lg font-black text-bappa-text">
          "{items.join(' ')}"
        </div>
      </div>

      {/* Submit Button */}
      {!revealed && (
        <button
          type="button"
          onClick={handleConfirmSubmit}
          disabled={disabled || submitted}
          className="btn-primary w-full shadow-saffron py-3.5 flex items-center justify-center gap-2 text-sm sm:text-base font-bold"
        >
          <Send className="w-4 h-4" /> Submit Final Order
        </button>
      )}
    </div>
  );
}
