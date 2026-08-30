// Jest mock for react-native-markdown-display: render plain text in tests.
import React from 'react';
import { Text } from 'react-native';

export default function MarkdownMock({ children }: any) {
  return <Text>{children}</Text>;
}
