import React from 'react';
import { View } from 'react-native';

function createMockIcon(name: string) {
  const MockIcon = ({ color, size, style, ...props }: any) => {
    const resolvedStyle = [
      { color: color },
      style,
    ].filter(Boolean);
    return React.createElement(View, {
      ...props,
      style: resolvedStyle,
      'data-name': name,
    });
  };
  MockIcon.displayName = name;
  return MockIcon;
}

export const Ionicons = createMockIcon('Ionicons');
export const MaterialCommunityIcons = createMockIcon('MaterialCommunityIcons');
export const MaterialIcons = createMockIcon('MaterialIcons');
export const FontAwesome = createMockIcon('FontAwesome');
export const AntDesign = createMockIcon('AntDesign');

const VectorIcons = {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
  FontAwesome,
  AntDesign,
};

export default VectorIcons;
