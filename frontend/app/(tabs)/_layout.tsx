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
    <View className="items-center justify-center gap-2 -mb-9">
      {icon === "camera" ? (
        <MaterialIcons 
          name={icon} 
          size={30} 
          color={color} 
          className="w-auto h-auto text-center" 
        />
      ) : (
        <FontAwesome5 
          name={icon} 
          size={24} 
          color={color} 
          className="w-auto h-auto text-center" 
        />
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