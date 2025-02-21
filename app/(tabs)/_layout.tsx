import { View, Text } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const TabIcon = ({ icon, color, name, focused }) => {
  return (
    <View className="items-center justify-center gap-2">
      {icon === "camera" ? (
        <MaterialIcons 
          name={icon} 
          size={24} 
          color={color} 
          className="w-full h-full text-center" 
        />
      ) : (
        <FontAwesome5 
          name={icon} 
          size={24} 
          color={color} 
          className="w-full h-full text-center" 
        />
      )}
      <Text className={`${focused ? 'font-psemibold' : 'font-pregular'} text-xs`}>
        {name}
      </Text>
    </View>
  );
};

const TabsLayout = () => {
  return (
    <>
      <Tabs
        screenOptions={{
          tabBarShowLabel: false
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
                name="Home" 
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
                name="Camera" 
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
                name="Profile" 
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