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
  builder.upsert = jest.fn(() => createQueryBuilder(result));
  builder.or = jest.fn(() => createQueryBuilder(result));
  builder.limit = jest.fn(() => createQueryBuilder(result));
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

// Default mock RPC implementation that returns test chunks for the two
// search functions the RAG service actually calls.
mockRpc.mockImplementation((functionName: string, params: any) => {
  if (functionName === 'match_manuals' || functionName === 'match_manuals_by_text') {
    // A deliberately low-similarity query returns nothing so callers exercise
    // the fallback path.
    if (params?.query_embedding === '[]' || params?.search_query === 'caries sin match') {
      return Promise.resolve({ data: [], error: null });
    }
    return Promise.resolve({
      data: [
        {
          id: 'chunk-1',
          content: 'Dental anatomy involves the study of tooth structure.',
          title: 'Dental Anatomy Basics',
          source_document: 'Clinical Manual Vol 1',
          page_number: 12,
          similarity: 0.95,
        },
        {
          id: 'chunk-2',
          content: 'The periodontium consists of the gingiva and supporting structures.',
          title: 'Periodontology',
          source_document: 'Clinical Manual Vol 2',
          page_number: 97,
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
