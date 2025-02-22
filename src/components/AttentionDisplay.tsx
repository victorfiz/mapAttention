'use client';

import { useEffect, useState } from 'react';
import { AttentionData, parseAttentionBinary } from '@/utils/attentionParser';
import { TextScramble } from '@/components/ui/text-scramble';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function AttentionDisplay() {
  const [attentionData, setAttentionData] = useState<AttentionData | null>(null);
  const [hoveredTokenIndex, setHoveredTokenIndex] = useState<number | null>(null);
  const [attentionMode, setAttentionMode] = useState<'raw' | 'normalized' | 'amplified'>('normalized');
  const [triggerScramble, setTriggerScramble] = useState(false);

  useEffect(() => {
    // For now, we'll fetch the binary file directly from the public directory
    fetch('/attention_data.bin')
      .then(response => response.arrayBuffer())
      .then(buffer => {
        const data = parseAttentionBinary(buffer);
        console.log('Tokens:', data.tokens); // Debug log
        setAttentionData(data);
      })
      .catch(error => {
        console.error('Error loading attention data:', error);
      });
  }, []);

  if (!attentionData) {
    return <div className="text-center text-black">Loading attention data...</div>;
  }

  // Approach 1: Linear scaling based on sequence length and clipping values over 1
  const getAmplifiedScore = (score: number, tokenIndex: number, rowIndex: number): number => {
    const effectiveRowLength = rowIndex + 1;  // number of tokens the attention is distributed across
    return Math.min(score * (effectiveRowLength / 2), 1);
  };

  // Approach 2: Relative normalization within each row by dividing by the maximum score
  const getMaxAndMinAttentionInRow = (rowIndex: number): { max: number, min: number } => {
    let maxScore = 0;
    let minScore = Infinity;
    // Find the highest attention score and lowest non-zero score in the current row
    for (let i = 0; i <= rowIndex; i++) {
      const score = attentionData.attentionMap[rowIndex * attentionData.shape[1] + i];
      if (score > 0) {
        maxScore = Math.max(maxScore, score);
        minScore = Math.min(minScore, score);
      }
    }
    return { max: maxScore, min: minScore === Infinity ? 0 : minScore };
  };

  const getNormalizedScore = (score: number, tokenIndex: number, rowIndex: number): number => {
    if (score === 0) return 0;
    const { max: maxScore, min: minScore } = getMaxAndMinAttentionInRow(rowIndex);
    if (maxScore === minScore) return 1; // If all non-zero scores are equal, show full intensity
    // Linear interpolation: (x - min) / (max - min)
    return (score - minScore) / (maxScore - minScore);
  };

  // Get the attention weights for the currently hovered token
  const getAttentionWeight = (tokenIndex: number) => {
    if (hoveredTokenIndex === null) return 0;
    // Get the raw attention weight
    const rawWeight = attentionData.attentionMap[hoveredTokenIndex * attentionData.shape[1] + tokenIndex];
    
    // Only process scores for tokens that are actually attended to
    if (tokenIndex > hoveredTokenIndex) return rawWeight;

    // Apply the selected scoring method
    switch (attentionMode) {
      case 'normalized':
        return getNormalizedScore(rawWeight, tokenIndex, hoveredTokenIndex);
      case 'amplified':
        return getAmplifiedScore(rawWeight, tokenIndex, hoveredTokenIndex);
      default:
        return rawWeight;
    }
  };

  const cleanToken = (token: string) => {
    if (token === '<s>') return '\u00A0'; // Show empty space for start token
    return token.replace(/^▁/, '\u00A0').replace(/▁/g, '\u00A0'); 
  };

  const getButtonText = () => {
    switch (attentionMode) {
      case 'normalized':
        return 'Normalized Attention';
      case 'amplified':
        return 'Amplified Attention';
      default:
        return 'Raw Attention';
    }
  };

  const cycleAttentionMode = () => {
    setAttentionMode(current => {
      switch (current) {
        case 'raw':
          return 'normalized';
        case 'normalized':
          return 'amplified';
        default:
          return 'raw';
      }
    });
    setTriggerScramble(true);
  };

  const getTooltipContent = () => {
    switch (attentionMode) {
      case 'raw':
        return "The real attention scores. For long sequences where attention is shared across many tokens,the patterns become difficult to discern.";
      case 'normalized':
        return "Attention is normalized with respect to the highest score for that query. The max score receives full intensity. The lowest score receives 0 intensity.";
      case 'amplified':
        return "Attention is upscaled by the number of tokens it is shared across (i.e. position of query in sequence). Scores above 1 are clipped. For long sequences, attention will not fade out.";
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="fixed top-4 left-4">
        <TooltipProvider>
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <button 
                onClick={cycleAttentionMode}
                className="cursor-pointer rounded-[8px] bg-neutral-100 px-3 py-1 text-xs text-neutral-800 transition-colors hover:bg-neutral-200 active:bg-neutral-300"
              >
                <TextScramble
                  speed={0.02}
                  trigger={triggerScramble}
                  onScrambleComplete={() => setTriggerScramble(false)}
                >
                  {getButtonText()}
                </TextScramble>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="start" className="min-w-[12rem] max-w-[18rem] w-max">
              <p className="text-xs whitespace-normal hyphens-auto">{getTooltipContent()}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="flex flex-wrap gap-0.5 justify-center max-w-2xl">
        {attentionData.tokens.map((token, index) => (
          <span
            key={index}
            className="rounded text-lg transition-colors duration-100 cursor-pointer text-black whitespace-pre inline-flex items-center justify-center"
            style={{
              backgroundColor: `rgba(100, 214, 92, ${getAttentionWeight(index)})`,
              width: token === '<s>' ? '1.75rem' : 'auto',
              height: '1.75rem',
              minWidth: token === '<s>' ? '1.75rem' : '0',
            }}
            onMouseEnter={() => setHoveredTokenIndex(index)}
            onMouseLeave={() => setHoveredTokenIndex(null)}
          >
            {cleanToken(token)}
          </span>
        ))}
      </div>
      <p className="text-sm text-gray-600 mt-4">
        Hover over a token to see how it is attended to
      </p>
    </div>
  );
} 