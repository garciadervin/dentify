import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface AppHeaderProps {
  subtitle?: string;
  description?: string;
}

export default function AppHeader({ subtitle, description }: AppHeaderProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
      <View
        testID="app-header"
        style={{
          height: 64,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 24,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: 'Manrope-Bold',
              fontSize: 22,
              color: colors.deepSlate,
            }}
          >
            Dentify
          </Text>
          {subtitle ? (
            <Text
              style={{
                fontFamily: 'Inter-SemiBold',
                fontSize: 11,
                color: colors.neutral,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              {subtitle}
            </Text>
          ) : null}
          {description ? (
            <Text
              style={{
                fontFamily: 'Inter',
                fontSize: 14,
                color: colors.neutral,
              }}
            >
              {description}
            </Text>
          ) : null}
        </View>
        <View
          testID="user-avatar"
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.borderLight,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="person-outline" size={22} color={colors.neutral} />
        </View>
      </View>
    </SafeAreaView>
  );
}
