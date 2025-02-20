export interface AttentionData {
  tokens: string[];
  attentionMap: Float32Array;
  shape: [number, number];
}

export function parseAttentionBinary(buffer: ArrayBuffer): AttentionData {
  const view = new DataView(buffer);
  let offset = 0;

  // Read header information
  const numTokens = view.getUint32(offset, true);
  offset += 4;
  const height = view.getUint32(offset, true);
  offset += 4;
  const width = view.getUint32(offset, true);
  offset += 4;

  // Read tokens
  const tokens: string[] = [];
  for (let i = 0; i < numTokens; i++) {
    const tokenLength = view.getUint32(offset, true);
    offset += 4;
    
    const tokenBytes = new Uint8Array(buffer.slice(offset, offset + tokenLength));
    const token = new TextDecoder().decode(tokenBytes);
    tokens.push(token);
    offset += tokenLength;
  }

  // Read attention map data
  const attentionMapBuffer = buffer.slice(offset);
  const attentionMap = new Float32Array(attentionMapBuffer);

  return {
    tokens,
    attentionMap,
    shape: [height, width]
  };
} 