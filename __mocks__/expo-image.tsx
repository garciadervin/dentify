// Jest mock for expo-image: renders a plain View (no native module in tests).
import React from 'react';
import { View } from 'react-native';

export function Image({ style, testID, ...rest }: any) {
  return <View testID={testID} style={[{ backgroundColor: '#e2e8f0' }, style]} {...rest} />;
}

export default { Image };
