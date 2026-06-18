import React from 'react';

// Use inline View creation instead of importing from react-native
// to avoid circular dependency issues with NativeWind
const View = (props: any) => {
  const { children, style, ...rest } = props;
  return React.createElement('View', { ...rest, style }, children);
};

const SafeAreaView = React.forwardRef(
  ({ children, style, edges, ...props }: any, ref: any) =>
    React.createElement(View, { ...props, ref, style }, children)
);
SafeAreaView.displayName = 'SafeAreaView';

const SafeAreaProvider = ({ children }: any) =>
  React.createElement(View, null, children);

const useSafeAreaInsets = () => ({ top: 0, bottom: 0, left: 0, right: 0 });

const SafeAreaConsumer = ({ children }: any) =>
  children({ top: 0, bottom: 0, left: 0, right: 0 });

const SafeAreaInsetsContext = React.createContext({ top: 0, bottom: 0, left: 0, right: 0 });
const SafeAreaFrameContext = React.createContext({ width: 390, height: 884, x: 0, y: 0 });

export {
  SafeAreaView,
  SafeAreaProvider,
  SafeAreaConsumer,
  useSafeAreaInsets,
  SafeAreaInsetsContext,
  SafeAreaFrameContext,
};

export default {
  SafeAreaView,
  SafeAreaProvider,
  SafeAreaConsumer,
  useSafeAreaInsets,
  SafeAreaInsetsContext,
  SafeAreaFrameContext,
};
