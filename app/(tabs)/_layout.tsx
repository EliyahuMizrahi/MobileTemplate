import { View, Text } from 'react-native';
import { Tabs } from 'expo-router';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

type TabIconProps = {
  icon: string;
  color: string;
  name: string;
  focused: boolean;
};

const TabIcon = ({ icon, color, name, focused }: TabIconProps): JSX.Element => {
  return (
    <View className="items-center justify-center gap-2 -mb-10">
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
      <Text
        className={`${focused ? 'font-psemibold' : 'font-pregular'} text-xs`}
        style={{ color: color }}
      >
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
          tabBarShowLabel: false,
          tabBarActiveTintColor: '#a5bbde',
          tabBarInactiveBackgroundColor: '#CDCE0',
          tabBarStyle: {
            backgroundColor: '#161622',
            borderTopWidth: 1,
            borderTopColor: '#232533',
            height: 100,
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