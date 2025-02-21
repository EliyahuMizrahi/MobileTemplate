import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';

const index = () => {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-3xl font-pblack">Appraisal</Text>
      <FontAwesome5 name="house-user" size={40} color="black" />
      <StatusBar style="auto" />
      <Link href="/home">Go to Home</Link>
    </View>
  )
}

export default index