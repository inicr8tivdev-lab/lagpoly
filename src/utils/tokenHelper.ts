import { TOKENS, TokenOption } from '../data/lagosBoard';

export function getTokenMeta(tokenId: string): TokenOption {
  return TOKENS.find(t => t.id === tokenId) || TOKENS[0];
}
