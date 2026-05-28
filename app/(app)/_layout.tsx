import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { T } from '@/theme/tokens';
import { useAuth } from '@/lib/auth';
import { registerForPush } from '@/lib/push';

export default function AppLayout() {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) registerForPush(user.id).catch((e) => console.warn('push register failed', e));
  }, [user?.id]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: T.green,
        tabBarInactiveTintColor: T.ink2,
        tabBarStyle: { borderTopColor: T.border, backgroundColor: T.surface },
        tabBarLabelStyle: { fontFamily: 'Outfit_500Medium', fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Pipeline',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="list"
        options={{
          title: 'All apps',
          tabBarIcon: ({ color, size }) => <Ionicons name="list-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="add" options={{ href: null }} />
      <Tabs.Screen name="app/[id]" options={{ href: null }} />
    </Tabs>
  );
}
