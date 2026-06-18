/**
 * Mock for @supabase/supabase-js
 *
 * Provides a mock Supabase client that returns test data for RPC calls.
 */

const mockRpc = jest.fn();

// Helper to create a chainable query builder that returns a promise
function createQueryBuilder(result: any) {
  const builder: any = () => Promise.resolve(result);
  builder.eq = jest.fn(() => createQueryBuilder(result));
  builder.order = jest.fn(() => createQueryBuilder(result));
  builder.single = jest.fn(() => Promise.resolve(result));
  builder.select = jest.fn(() => createQueryBuilder(result));
  builder.insert = jest.fn(() => createQueryBuilder(result));
  builder.update = jest.fn(() => createQueryBuilder(result));
  builder.delete = jest.fn(() => createQueryBuilder(result));
  builder.then = (onfulfilled: any, onrejected: any) =>
    Promise.resolve(result).then(onfulfilled, onrejected);
  return builder;
}

const defaultResult = { data: [], error: null };

const mockFrom = jest.fn(() => createQueryBuilder(defaultResult));

const mockSupabaseClient = {
  from: mockFrom,
  rpc: mockRpc,
  auth: {
    signUp: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    signInWithPassword: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    signOut: jest.fn(() => Promise.resolve({ error: null })),
    getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
  },
};

// Default mock RPC implementation that returns test chunks
mockRpc.mockImplementation((functionName: string, params: any) => {
  if (functionName === 'match_clinical_manuals') {
    // Return empty for queries that don't match clinical content
    if (params?.query_text === 'What is caries?') {
      return Promise.resolve({ data: [], error: null });
    }
    return Promise.resolve({
      data: [
        {
          id: 'chunk-1',
          content: 'Dental anatomy involves the study of tooth structure.',
          title: 'Dental Anatomy Basics',
          source_document: 'Clinical Manual Vol 1',
          similarity: 0.95,
        },
        {
          id: 'chunk-2',
          content: 'The periodontium consists of the gingiva and supporting structures.',
          title: 'Periodontology',
          source_document: 'Clinical Manual Vol 2',
          similarity: 0.89,
        },
      ],
      error: null,
    });
  }
  return Promise.resolve({ data: [], error: null });
});

export function createClient(_url: string, _key: string) {
  return mockSupabaseClient;
}

export { mockSupabaseClient, mockRpc, mockFrom };
