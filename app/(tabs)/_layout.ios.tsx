
import React from 'react';
import { Stack } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { Dimensions } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function TabLayout() {
  const tabs: TabBarItem[] = [
    {
      name: 'calendar',
      route: '/(tabs)/calendar',
      icon: 'calendar-today',
      label: 'Calendar',
    },
    {
      name: 'profile',
      route: '/(tabs)/profile',
      icon: 'person',
      label: 'Profile',
    },
  ];

  return (
    <React.Fragment>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
        }}
        initialRouteName="calendar"
      >
        <Stack.Screen key="calendar" name="calendar" />
        <Stack.Screen key="profile" name="profile" />
      </Stack>
      <FloatingTabBar 
        tabs={tabs} 
        containerWidth={SCREEN_WIDTH - 40}
      />
    </React.Fragment>
  );
}
