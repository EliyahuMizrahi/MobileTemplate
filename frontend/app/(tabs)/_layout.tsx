import { View, Text } from 'react-native';
import { Tabs } from 'expo-router';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';

type TabIconProps = {
  icon: string;
  color: string;
  focused: boolean;
};

const TabIcon = ({ icon, color, focused }: TabIconProps): JSX.Element => {
  return (
    <View className="flex items-center justify-center h-full -mb-9">
      {icon === "camera" ? (
        <View className="flex items-center justify-center">
          <MaterialIcons 
            name={icon} 
            size={30} 
            color={color}
          />
        </View>
      ) : (
        <View className="flex items-center justify-center">
          <FontAwesome5 
            name={icon} 
            size={24} 
            color={color}
          />
        </View>
      )}
    </View>
  );
};

const TabsLayout = () => {
  return (
    <>
      <Tabs
        screenOptions={{
          tabBarShowLabel: false,
          tabBarActiveTintColor: '#a5bbde',
          tabBarInactiveBackgroundColor: '#CDCE0',
          tabBarStyle: {
            backgroundColor: '#161622',
            borderTopWidth: 1,
            borderTopColor: '#232533',
            height: 80,
          },
          tabBarItemStyle: {
            height: '100%',
            paddingTop: 0,
            paddingBottom: 0,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "Home",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon 
                icon="house-user"
                color={color}
                focused={focused} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="camera"
          options={{
            title: "Camera",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon 
                icon="camera"
                color={color}
                focused={focused} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon 
                icon="user-alt"
                color={color}
                focused={focused} 
              />
            ),
          }}
        />        
      </Tabs>
    </>
  );
};

export default TabsLayout;