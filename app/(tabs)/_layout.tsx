import { Tabs } from 'expo-router';
import { colors, fontSize } from '@theme/index';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: 4,
        },
        tabBarLabelStyle: {
          fontSize: fontSize.xs,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'POS', tabBarIcon: ({ color }) => <TabIcon icon="🛒" color={color} /> }}
      />
      <Tabs.Screen
        name="inventory"
        options={{ title: 'Products', tabBarIcon: ({ color }) => <TabIcon icon="📦" color={color} /> }}
      />
      <Tabs.Screen
        name="sales"
        options={{ title: 'Sales', tabBarIcon: ({ color }) => <TabIcon icon="📊" color={color} /> }}
      />
      <Tabs.Screen
        name="orders"
        options={{ title: 'Orders', tabBarIcon: ({ color }) => <TabIcon icon="🧾" color={color} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings', tabBarIcon: ({ color }) => <TabIcon icon="⚙️" color={color} /> }}
      />
    </Tabs>
  );
}

function TabIcon({ icon, color }: { icon: string; color: string }) {
  // Swap for @expo/vector-icons once you add an icon font.
  const { Text } = require('react-native');
  return <Text style={{ fontSize: 20 }}>{icon}</Text>;
}
