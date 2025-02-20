'use client';

import { useEffect, useState } from 'react';
import { AttentionData, parseAttentionBinary } from '@/utils/attentionParser';

export default function AttentionDisplay() {
  const [attentionData, setAttentionData] = useState<AttentionData | null>(null);
  const [hoveredTokenIndex, setHoveredTokenIndex] = useState<number | null>(null);

  useEffect(() => {
    // For now, we'll fetch the binary file directly from the public directory
    fetch('/attention_data.bin')
      .then(response => response.arrayBuffer())
      .then(buffer => {
        const data = parseAttentionBinary(buffer);
        setAttentionData(data);
      })
      .catch(error => {
        console.error('Error loading attention data:', error);
      });
  }, []);

  if (!attentionData) {
    return <div className="text-center text-black">Loading attention data...</div>;
  }

  // Get the attention weights for the currently hovered token
  const getAttentionWeight = (tokenIndex: number) => {
    if (hoveredTokenIndex === null) return 0;
    // Get the row of attention weights for the hovered token
    return attentionData.attentionMap[hoveredTokenIndex * attentionData.shape[1] + tokenIndex];
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
        {attentionData.tokens.map((token, index) => (
          <span
            key={index}
            className="px-3 py-1.5 rounded text-lg transition-colors duration-200 cursor-pointer text-black"
            style={{
              backgroundColor: `rgba(100, 214, 92, ${getAttentionWeight(index)})`,
            }}
            onMouseEnter={() => setHoveredTokenIndex(index)}
            onMouseLeave={() => setHoveredTokenIndex(null)}
          >
            {token}
          </span>
        ))}
      </div>
      <p className="text-sm text-gray-600 mt-4">
        Hover over a token to see its attention pattern
      </p>
    </div>
  );
} 