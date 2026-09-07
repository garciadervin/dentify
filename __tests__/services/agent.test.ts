import { sendAgentMessage } from '@/src/services/agent';

const mockGetSession = jest.fn();

jest.mock('@/src/lib/supabase', () => ({
  getSupabase: jest.fn(() => ({ auth: { getSession: mockGetSession } })),
}));

describe('agent client', () => {
  const fetchMock = global.fetch as jest.Mock;

  beforeEach(() => {
    fetchMock.mockReset();
    mockGetSession.mockReset();
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok-123' } }, error: null });
  });

  it('sends Bearer + payload and maps content and sources', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: 'Respuesta', sources: [{ type: 'manual', title: 'Manual' }] }),
    });

    const res = await sendAgentMessage(
      [{ role: 'user', content: 'hola' }],
      [{ name: 'x.jpg', mime: 'image/jpeg', base64: 'QUJD' }]
    );

    expect(res.content).toBe('Respuesta');
    expect(res.sources).toEqual([{ type: 'manual', title: 'Manual' }]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/functions/v1/denty-agent');
    expect(init.headers.Authorization).toBe('Bearer tok-123');
    const body = JSON.parse(init.body);
    expect(body.messages).toEqual([{ role: 'user', content: 'hola' }]);
    expect(body.attachments).toEqual([{ name: 'x.jpg', mime: 'image/jpeg', base64: 'QUJD' }]);
  });

  it('throws when there is no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    await expect(sendAgentMessage([{ role: 'user', content: 'hola' }])).rejects.toThrow('Sesión no iniciada');
  });

  it('maps a non-ok body error to the server message', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: 'Demasiadas solicitudes. Espera un momento.' }),
    });
    await expect(sendAgentMessage([{ role: 'user', content: 'hola' }])).rejects.toThrow(
      'Demasiadas solicitudes. Espera un momento.'
    );
  });

  it('maps an abort/timeout to a friendly message', async () => {
    const abortErr = new Error('Aborted');
    abortErr.name = 'AbortError';
    fetchMock.mockRejectedValueOnce(abortErr);
    await expect(sendAgentMessage([{ role: 'user', content: 'hola' }])).rejects.toThrow(
      'El asistente está tardando en responder'
    );
  });
});
