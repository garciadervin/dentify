// Jest mock for expo-document-picker (no native module in tests).
export const getDocumentAsync = jest.fn(async () => ({ canceled: true, assets: [] }));
export default { getDocumentAsync };
