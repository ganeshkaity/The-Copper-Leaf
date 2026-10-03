'use client';

import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AiGenerateButtonProps {
  onGenerated: (text: string) => void;
  itemName: string;
  type?: 'menu-item' | 'offer' | 'restaurant-about' | 'recipe';
  category?: string;
  cuisine?: string;
  existingText?: string;
  currentText?: string;
  promptHint?: string;
  label?: string;
  className?: string;
}

export function AiGenerateButton({
  onGenerated,
  itemName,
  type = 'menu-item',
  category,
  cuisine,
  existingText,
  currentText,
  promptHint,
  label = 'AI Generate',
  className = '',
}: AiGenerateButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    const textContext = currentText || existingText;
    if (!itemName && !textContext) {
      toast.error('Please enter a name or title first so AI knows what to write about!');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: itemName,
          type,
          category,
          cuisine,
          existingText: textContext,
          promptHint,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'AI generation failed');
      }

      onGenerated(data.text);
      toast.success('AI description generated!');
    } catch (err: any) {
      toast.error('AI Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGenerate}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60 transition-all shadow-2xs disabled:opacity-50 cursor-pointer ${className}`}
      title="Generate description using OpenRouter AI"
    >
      {loading ? (
        <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
      ) : (
        <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
      )}
      <span>{loading ? 'Crafting...' : label}</span>
    </button>
  );
}
