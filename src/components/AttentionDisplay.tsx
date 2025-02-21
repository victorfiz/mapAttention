'use client';

import { useEffect, useState } from 'react';
import { AttentionData, parseAttentionBinary } from '@/utils/attentionParser';

export default function AttentionDisplay() {
  const [attentionData, setAttentionData] = useState<AttentionData | null>(null);
  const [hoveredTokenIndex, setHoveredTokenIndex] = useState<number | null>(null);
  const [useAmplifiedScores, setUseAmplifiedScores] = useState(false);

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

  // Amplify attention scores using a custom function that accounts for autoregressive attention
  const amplifyAttentionScore = (score: number, tokenIndex: number): number => {
    // In autoregressive attention, a token at position i can only attend to positions 0 to i
    // So the effective row length is (tokenIndex + 1)
    const effectiveRowLength = hoveredTokenIndex !== null ? hoveredTokenIndex + 1 : 1;
    return Math.min(score * (effectiveRowLength / 2), 1);
  };

  // Get the attention weights for the currently hovered token
  const getAttentionWeight = (tokenIndex: number) => {
    if (hoveredTokenIndex === null) return 0;
    // Get the raw attention weight
    const rawWeight = attentionData.attentionMap[hoveredTokenIndex * attentionData.shape[1] + tokenIndex];
    // Return either raw or amplified score based on toggle state
    // Only amplify scores for tokens that are actually attended to (i.e., current and previous tokens)
    return useAmplifiedScores && tokenIndex <= hoveredTokenIndex 
      ? amplifyAttentionScore(rawWeight, tokenIndex) 
      : rawWeight;
  };

  const cleanToken = (token: string) => {
    if (token === '<s>') return '\u00A0'; // Show empty space for start token
    return token.replace(/^▁/, '\u00A0').replace(/▁/g, '\u00A0'); 
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="fixed top-4 left-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={useAmplifiedScores}
              onChange={(e) => setUseAmplifiedScores(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-3 h-3 border border-gray-300 rounded peer-checked:bg-[#64d65c] peer-checked:border-[#4fb849] transition-colors" />
          </div>
          <span className="text-sm font-medium text-gray-900">
            {useAmplifiedScores ? 'Amplified Scores' : 'Raw Scores'}
          </span>
        </label>
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