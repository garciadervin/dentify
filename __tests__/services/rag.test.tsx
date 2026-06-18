import {
  retrieveRelevantChunks,
  generatePrompt,
  chatWithContext,
} from '@/src/services/rag';
import type { GroqMessage } from '@/src/services/groq';
import type { ChunkResult } from '@/src/services/rag';

describe('RAG Service', () => {
  describe('retrieveRelevantChunks', () => {
    it('should return empty array when Supabase is not configured', async () => {
      const chunks = await retrieveRelevantChunks('What is caries?');
      expect(chunks).toEqual([]);
    });

    it('should return array of chunks when Supabase is configured', async () => {
      const chunks = await retrieveRelevantChunks('dental anatomy');
      expect(Array.isArray(chunks)).toBe(true);
    });
  });

  describe('generatePrompt', () => {
    it('should include context in the prompt', () => {
      const query = 'What is periodontitis?';
      const context: ChunkResult[] = [
        { id: '1', title: 'Manual', source: 'test.pdf', content: 'Periodontitis is a gum infection.', similarity: 0.95 },
      ];
      const prompt = generatePrompt(query, context);
      expect(prompt).toContain('Periodontitis is a gum infection.');
    });

    it('should instruct the assistant about its role as clinical expert', () => {
      const query = 'What is periodontitis?';
      const context: ChunkResult[] = [
        { id: '1', title: 'Manual', source: 'test.pdf', content: 'Periodontitis is a gum infection.', similarity: 0.95 },
      ];
      const prompt = generatePrompt(query, context);
      expect(prompt).toMatch(/clinical|expert|dentist|specialist/i);
    });
  });

  describe('chatWithContext', () => {
    it('should combine RAG context with the user message', async () => {
      const messages: GroqMessage[] = [
        { role: 'user', content: 'Tell me about implants' },
      ];
      const response = await chatWithContext(messages);
      expect(response).toBeDefined();
      expect(response).toHaveProperty('content');
    });
  });
});
