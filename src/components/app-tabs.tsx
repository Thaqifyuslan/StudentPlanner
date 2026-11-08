import { NativeTabs } from 'expo-router/native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Overview</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="cgpa">
        <NativeTabs.Trigger.Label>CGPA</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="function"
          md="calculate"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="jadual">
        <NativeTabs.Trigger.Label>Jadual</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'calendar', selected: 'calendar' }}
          md="calendar_month"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="revision">
        <NativeTabs.Trigger.Label>Revision</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          sf={{ default: 'book.closed', selected: 'book.closed.fill' }}
          md="menu_book"
          renderingMode="template"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tugasan">
        <NativeTabs.Trigger.Label>Tugasan</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'book', selected: 'book.fill' }}
          md="menu_book"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
          md="account_circle"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
