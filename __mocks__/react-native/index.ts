import React from 'react';

// A minimal mock of react-native that works with React 19
// The built-in jest mock from react-native is incompatible with React 19
// because it relies on React.Component which is no longer available.

const MockComponent = (name: string) => {
  const Comp = React.forwardRef(
    ({ children, style, ...props }: any, ref: any) => {
      return React.createElement(
        name,
        { ...props, ref, style },
        children
      );
    }
  );
  Comp.displayName = name;
  return Comp;
};

// Smart FlatList mock that renders items from data/renderItem
const MockFlatList = React.forwardRef(
  ({ data, renderItem, style, ...props }: any, ref: any) => {
    const items = React.useMemo(() => {
      if (!data || !renderItem) return null;
      return data.map((item: any, index: number) =>
        renderItem({ item, index, separators: {} })
      );
    }, [data, renderItem]);

    return React.createElement(
      'FlatList',
      { ...props, ref, style },
      items
    );
  }
);
MockFlatList.displayName = 'FlatList';

const RN = {
  View: MockComponent('View'),
  Text: MockComponent('Text'),
  ScrollView: MockComponent('ScrollView'),
  SafeAreaView: MockComponent('SafeAreaView'),
  Image: MockComponent('Image'),
  TextInput: MockComponent('TextInput'),
  TouchableOpacity: MockComponent('TouchableOpacity'),
  TouchableHighlight: MockComponent('TouchableHighlight'),
  ActivityIndicator: MockComponent('ActivityIndicator'),
  FlatList: MockFlatList,
  SectionList: MockComponent('SectionList'),
  KeyboardAvoidingView: MockComponent('KeyboardAvoidingView'),
  Modal: MockComponent('Modal'),
  Pressable: MockComponent('Pressable'),
  RefreshControl: MockComponent('RefreshControl'),
  StatusBar: MockComponent('StatusBar'),
  Switch: MockComponent('Switch'),
  StyleSheet: {
    create: (styles: any) => styles,
    hairlineWidth: () => 0.5,
    flatten: (style: any) => {
      if (Array.isArray(style)) {
        return Object.assign({}, ...style.filter(Boolean));
      }
      return style;
    },
    absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    absoluteFillObject: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  },
  Platform: {
    OS: 'ios',
    Version: 0,
    select: (obj: any) => obj.ios ?? obj.default,
  },
  Dimensions: {
    get: () => ({ width: 390, height: 884, scale: 2, fontScale: 1 }),
    addEventListener: () => ({ remove: () => {} }),
    removeEventListener: () => {},
  },
  PixelRatio: {
    get: () => 2,
    getFontScale: () => 1,
    getPixelSizeForLayoutSize: (size: number) => size * 2,
    roundToNearestPixel: (size: number) => Math.round(size * 2) / 2,
  },
  I18nManager: {
    isRTL: false,
    allowRTL: () => {},
    forceRTL: () => {},
    swapLeftAndRightInRTL: () => {},
    getConstants: () => ({ isRTL: false }),
  },
  Animated: {
    View: MockComponent('AnimatedView'),
    Text: MockComponent('AnimatedText'),
    ScrollView: MockComponent('AnimatedScrollView'),
    Image: MockComponent('AnimatedImage'),
    createAnimatedComponent: (comp: any) => comp,
    timing: () => ({ start: () => {} }),
    spring: () => ({ start: () => {} }),
    Value: function (val: number) { return { _value: val }; },
    loop: () => ({ start: () => {} }),
    sequence: () => ({ start: () => {} }),
    parallel: () => ({ start: () => {} }),
    delay: () => ({ start: () => {} }),
    stagger: () => ({ start: () => {} }),
    event: () => () => {},
  },
  LogBox: {
    ignoreLogs: () => {},
    ignoreAllLogs: () => {},
  },
  AppState: {
    currentState: 'active',
    addEventListener: () => ({ remove: () => {} }),
    removeEventListener: () => {},
  },
  Linking: {
    openURL: () => Promise.resolve(),
    canOpenURL: () => Promise.resolve(true),
    addEventListener: () => ({ remove: () => {} }),
    removeEventListener: () => {},
    getInitialURL: () => Promise.resolve(null),
  },
  Alert: {
    alert: () => {},
    prompt: () => {},
  },
  Clipboard: {
    getString: () => Promise.resolve(''),
    setString: () => {},
  },
  Keyboard: {
    addListener: () => ({ remove: () => {} }),
    removeListener: () => {},
    removeAllListeners: () => {},
    dismiss: () => {},
  },
  LayoutAnimation: {
    configureNext: () => {},
    create: () => {},
    easeInEaseOut: () => {},
    linear: () => {},
    spring: () => {},
    Presets: { easeInEaseOut: {}, linear: {}, spring: {} },
    Types: { easeIn: {}, easeOut: {}, easeInEaseOut: {}, linear: {}, spring: {}, keyboard: {} },
    Properties: { opacity: {}, scaleXY: {} },
  },
  UIManager: {
    getViewManagerConfig: () => ({}),
    dispatchViewManagerCommand: () => {},
  },
  NativeModules: {},
  findNodeHandle: () => null,
  useColorScheme: () => 'light',
  Appearance: {
    getColorScheme: () => 'light',
    addChangeListener: () => ({ remove: () => {} }),
    removeChangeListener: () => {},
    setColorScheme: () => {},
  },
  AccessibilityInfo: {
    isReduceMotionEnabled: () => Promise.resolve(false),
    isScreenReaderEnabled: () => Promise.resolve(false),
    addEventListener: () => ({ remove: () => {} }),
    removeEventListener: () => {},
    announceForAccessibility: () => {},
    setAccessibilityFocus: () => {},
    isBoldTextEnabled: () => Promise.resolve(false),
    isGrayscaleEnabled: () => Promise.resolve(false),
    isInvertColorsEnabled: () => Promise.resolve(false),
    prefersCrossFadeTransitions: () => Promise.resolve(false),
    isReduceTransparencyEnabled: () => Promise.resolve(false),
  },
  ColorPropType: () => {},
  EdgeInsetsPropType: () => {},
  PointPropType: () => {},
  requireNativeComponent: () => MockComponent('NativeComponent'),
  Easing: {
    in: (easing: any) => easing,
    out: (easing: any) => easing,
    inOut: (easing: any) => easing,
    linear: (t: number) => t,
    ease: (t: number) => t,
    quad: (t: number) => t * t,
    cubic: (t: number) => t * t * t,
    sin: (t: number) => 1 - Math.cos((t * Math.PI) / 2),
    exp: (t: number) => Math.pow(2, 10 * (t - 1)),
    circle: (t: number) => 1 - Math.sqrt(1 - t * t),
    elastic: (t: number) =>
      t === 0 || t === 1 ? t : -Math.pow(2, 10 * (t - 1)) * Math.sin(((t - 1.1) * 5 * Math.PI) / 1),
    back: (t: number) => t * t * (3 * t - 2),
    bounce: (t: number) => {
      if (t < 0.5) return 1 / (2.75 * t * t);
      return 1 - 7.5625 * (t - 0.75) * (t - 0.75);
    },
    bezier: () => (t: number) => t,
    step0: (t: number) => (t > 0 ? 1 : 0),
    step1: (t: number) => (t >= 1 ? 1 : 0),
  },
};

export default RN;
export const {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  Dimensions,
  PixelRatio,
  I18nManager,
  Animated,
  LogBox,
  AppState,
  Linking,
  Alert,
  Keyboard,
  LayoutAnimation,
  UIManager,
  NativeModules,
  findNodeHandle,
  useColorScheme,
  Appearance,
  Image,
  TextInput,
  TouchableOpacity,
  TouchableHighlight,
  ActivityIndicator,
  FlatList,
  SectionList,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  RefreshControl,
  StatusBar,
  Switch,
  Easing,
} = RN;
