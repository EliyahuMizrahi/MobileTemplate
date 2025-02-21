import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';

const index = () => {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-3xl font-pblack">Appraisal</Text>
      <FontAwesome name="rocket" size={40} color="black" />
      <StatusBar style="auto" />
      <Link href="/profile">Go to Profile</Link>
    </View>
  )
}

export default index