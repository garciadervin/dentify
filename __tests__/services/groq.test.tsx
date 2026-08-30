/**
 * Tests for the Groq API service.
 *
 * The service routes through the groq-proxy Edge Function; the global fetch
 * mock in jest.setup.ts routes by the JSON body's `endpoint` field.
 */

import { sendMessage, transcribeAudio, embedTextForRetrieval } from '@/src/services/groq';
import type { GroqMessage } from '@/src/services/groq';

function lastSentBody(): any {
  const fetchMock = global.fetch as jest.Mock;
  const calls = fetchMock.mock.calls;
  const last = calls[calls.length - 1];
  return JSON.parse(last[1].body);
}

describe('Groq API Client', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('sendMessage', () => {
    it('returns the proxy content as a string', async () => {
      const messages: GroqMessage[] = [{ role: 'user', content: 'Hello' }];
      const response = await sendMessage(messages);
      expect(response.content).toBe('Respuesta simulada de Denty-AI.');
    });

    it('sends the request to the chat endpoint with a system message', async () => {
      await sendMessage([{ role: 'user', content: 'Tell me about caries' }]);
      const body = lastSentBody();
      expect(body.endpoint).toBe('chat/completions');
      expect(body.payload.model).toBe('qwen/qwen3.8-27b');
      expect(body.payload.messages[0].role).toBe('system');
      expect(body.payload.messages[0].content).toMatch(/asistente clínico/i);
    });

    it('uses the system prompt override', async () => {
      await sendMessage([{ role: 'user', content: 'Hi' }], { systemPrompt: 'Eres un dentista pediátrico.' });
      const body = lastSentBody();
      expect(body.payload.messages[0].content).toBe('Eres un dentista pediátrico.');
    });

    it('disables reasoning for a direct answer', async () => {
      await sendMessage([{ role: 'user', content: 'Hola' }]);
      expect(lastSentBody().payload.reasoning_effort).toBe('none');
    });

    it('strips the Qwen <think> reasoning block from the content', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(async () => ({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '<think>Razonamiento oculto</think>\n\nRespuesta final.' } }],
        }),
      }));
      const response = await sendMessage([{ role: 'user', content: 'Hola' }]);
      expect(response.content).toBe('Respuesta final.');
    });

    it('throws a friendly error when the proxy returns a non-ok response', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(async () => ({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' }),
      }));
      await expect(sendMessage([{ role: 'user', content: 'Hello' }])).rejects.toThrow(/Groq proxy error/i);
    });
  });

  describe('transcribeAudio', () => {
    it('returns the transcribed text as a string', async () => {
      const text = await transcribeAudio('file:///tmp/recording.m4a');
      expect(text).toBe('Transcripción simulada.');
    });

    it('sends the audio as base64 to the transcription endpoint', async () => {
      await transcribeAudio('file:///tmp/recording.m4a');
      const body = lastSentBody();
      expect(body.endpoint).toBe('audio/transcriptions');
      expect(body.audioBase64).toBe('mock-base64-content');
      expect(body.payload.model).toBe('whisper-large-v3');
    });

    it('throws a friendly error when the proxy returns a non-ok response', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(async () => ({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' }),
      }));
      await expect(transcribeAudio('file:///tmp/recording.m4a')).rejects.toThrow(/Groq transcription error/i);
    });
  });

  describe('embedTextForRetrieval', () => {
    it('returns the 1536-dim embedding from the proxy', async () => {
      const emb = await embedTextForRetrieval('¿qué es la caries?');
      expect(emb).toHaveLength(1536);
    });

    it('returns null when the proxy responds with an error', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(async () => ({
        ok: false,
        status: 500,
        json: async () => ({ error: 'x' }),
      }));
      const emb = await embedTextForRetrieval('x');
      expect(emb).toBeNull();
    });

    it('returns null when Supabase is not configured', async () => {
      delete process.env.EXPO_PUBLIC_SUPABASE_URL;
      const emb = await embedTextForRetrieval('x');
      expect(emb).toBeNull();
      process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    });
  });
});
