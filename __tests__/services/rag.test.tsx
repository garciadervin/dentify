import {
  retrieveRelevantChunks,
  generatePrompt,
  chatWithContext,
  CLINICAL_SYSTEM_PROMPT,
} from '@/src/services/rag';
import type { ChunkResult } from '@/src/services/rag';
import * as groq from '@/src/services/groq';
import * as supabaseLib from '@/src/lib/supabase';
import type { GroqMessage } from '@/src/services/groq';

describe('RAG Service', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('retrieveRelevantChunks', () => {
    it('returns an empty array when Supabase is not configured', async () => {
      jest.spyOn(supabaseLib, 'getSupabase').mockReturnValue(null as any);
      const chunks = await retrieveRelevantChunks('What is caries?');
      expect(chunks).toEqual([]);
    });

    it('uses the vector path and maps rows (semantic embeddings available)', async () => {
      jest.spyOn(groq, 'embedTextForRetrieval').mockResolvedValue(new Array(1536).fill(0.05));
      const chunks = await retrieveRelevantChunks('dental anatomy');

      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toMatchObject({
        source: 'Clinical Manual Vol 1',
        page: 12,
        similarity: 0.95,
      });
      expect(chunks[0].content).toContain('Dental anatomy');
      expect(chunks[1]).toMatchObject({
        source: 'Clinical Manual Vol 2',
        page: 97,
        similarity: 0.89,
      });
    });

    it('falls back to lexical search when no semantic embedding is available', async () => {
      jest.spyOn(groq, 'embedTextForRetrieval').mockResolvedValue(null);
      const chunks = await retrieveRelevantChunks('endodoncia');

      expect(Array.isArray(chunks)).toBe(true);
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].content).toContain('Dental anatomy');
    });

    it('returns an empty array when Supabase throws on both paths', async () => {
      jest.spyOn(groq, 'embedTextForRetrieval').mockResolvedValue(new Array(1536).fill(0.05));
      const mockClient = {
        rpc: jest.fn().mockRejectedValue(new Error('boom')),
        from: jest.fn().mockRejectedValue(new Error('boom')),
      };
      jest.spyOn(supabaseLib, 'getSupabase').mockReturnValue(mockClient as any);
      const chunks = await retrieveRelevantChunks('dental anatomy');
      expect(chunks).toEqual([]);
    });
  });

  describe('generatePrompt', () => {
    it('embeds the retrieved context and the query verbatim', () => {
      const context: ChunkResult[] = [
        { id: '1', title: 'Manual', source: 'test.pdf', content: 'Periodontitis is a gum infection.', similarity: 0.95 },
      ];
      const prompt = generatePrompt('What is periodontitis?', context);

      expect(prompt).toContain('Periodontitis is a gum infection.');
      expect(prompt).toContain('## Pregunta del usuario');
      expect(prompt).toContain('What is periodontitis?');
    });

    it('does not duplicate the system prompt (sendMessage adds it)', () => {
      const prompt = generatePrompt('hola', []);
      expect(prompt).not.toMatch(/asistente clínico|experto|especializado/i);
      expect(CLINICAL_SYSTEM_PROMPT).toMatch(/asistente clínico dental/i);
    });
  });

  describe('chatWithContext', () => {
    it('augments the last user message and forwards the full history', async () => {
      const sendSpy = jest.spyOn(groq, 'sendMessage').mockResolvedValue({ content: 'respuesta' });
      jest.spyOn(groq, 'embedTextForRetrieval').mockResolvedValue(new Array(1536).fill(0.05));

      const messages: GroqMessage[] = [
        { role: 'user', content: 'Hola' },
        { role: 'assistant', content: '¿En qué te ayudo?' },
        { role: 'user', content: 'Dime sobre implantes' },
      ];

      const response = await chatWithContext(messages);
      expect(response.content).toBe('respuesta');

      const [sentMessages, options] = sendSpy.mock.calls[0];
      // History preserved (3 turns), system prompt supplied separately.
      expect(sentMessages).toHaveLength(3);
      expect(sentMessages[0]).toEqual({ role: 'user', content: 'Hola' });
      expect(sentMessages[1]).toEqual({ role: 'assistant', content: '¿En qué te ayudo?' });
      expect(sentMessages[2].content).toContain('## Contexto de manuales clínicos');
      expect(sentMessages[2].content).toContain('Dime sobre implantes');
      expect(options?.systemPrompt).toBe(CLINICAL_SYSTEM_PROMPT);
    });
  });
});
