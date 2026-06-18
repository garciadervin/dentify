import { sendMessage, transcribeAudio } from '@/src/services/groq';
import type { GroqMessage } from '@/src/services/groq';

describe('Groq API Client', () => {
  describe('sendMessage', () => {
    it('should return a response from Groq API', async () => {
      const messages: GroqMessage[] = [{ role: 'user', content: 'Hello' }];
      const response = await sendMessage(messages);
      expect(response).toBeDefined();
      expect(response).toHaveProperty('content');
    });

    it('should accept system prompt override', async () => {
      const messages: GroqMessage[] = [{ role: 'user', content: 'Tell me about caries' }];
      const options = { systemPrompt: 'You are a pediatric dentist.' };
      const response = await sendMessage(messages, options);
      expect(response).toBeDefined();
      expect(response).toHaveProperty('content');
    });

    it('should throw when GROQ_API_KEY is not configured', async () => {
      const originalKey = process.env.GROQ_API_KEY;
      delete process.env.GROQ_API_KEY;

      const messages: GroqMessage[] = [{ role: 'user', content: 'Hello' }];
      await expect(sendMessage(messages)).rejects.toThrow(
        /GROQ_API_KEY/i
      );

      process.env.GROQ_API_KEY = originalKey;
    });
  });

  describe('transcribeAudio', () => {
    it('should return transcribed text', async () => {
      const audioUri = 'file:///tmp/recording.m4a';
      const text = await transcribeAudio(audioUri);
      expect(text).toBeDefined();
      expect(typeof text).toBe('string');
    });

    it('should throw when GROQ_API_KEY is not configured', async () => {
      const originalKey = process.env.GROQ_API_KEY;
      delete process.env.GROQ_API_KEY;

      const audioUri = 'file:///tmp/recording.m4a';
      await expect(transcribeAudio(audioUri)).rejects.toThrow(
        /GROQ_API_KEY/i
      );

      process.env.GROQ_API_KEY = originalKey;
    });
  });
});
