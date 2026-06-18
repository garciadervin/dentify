import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface BottomNavBarProps {
  activeTintColor?: string;
}

const TABS = [
  { name: 'index', icon: 'home' as const, testID: 'tab-index' },
  { name: 'simulator', icon: 'cube-outline' as const, testID: 'tab-simulator' },
  { name: 'scanner', icon: 'camera' as const, testID: 'tab-scanner' },
  { name: 'chat', icon: 'message' as const, testID: 'tab-chat' },
];

export default function BottomNavBar({ activeTintColor }: BottomNavBarProps) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', height: 64 }}>
      {TABS.map((tab) => (
        <MaterialCommunityIcons
          key={tab.name}
          testID={tab.testID}
          name={tab.icon}
          size={28}
          color={activeTintColor ?? '#70787D'}
        />
      ))}
    </View>
  );
}
