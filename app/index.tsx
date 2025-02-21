import { StatusBar } from 'expo-status-bar';
import { Image, ScrollView, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import logo from '../assets/images/logo.png';
import styled_text from '../assets/images/styled_text.png';
import CustomButton from '@/components/CustomButton';
import cards from '../assets/images/cards.png'
import ImageStyled from '@/components/ImageStyled';

export default function App() {
  return (
    <SafeAreaView className="bg-primary flex-1">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 w-full items-center justify-center px-4">
          <Image 
            source={logo}
            style={{ width: 300, height: 90 }}
            resizeMode="contain"
          />
          
          <Image 
            source={cards}
            className="max-w-[380px] w-full"
            style= {{ height: 300 }}
          />

          <View className="mt-5">
            <Text className="text-3xl text-white font-bold text-center leading-[40px]">
              Discover Endless Possibilities with{' '}
              <ImageStyled source={styled_text} />
            </Text>
          </View>

          <Text className="text-sm font-pregular text-gray-100 mt-7 text-center">
            Where creativity meets innovation: embark on a journey of limitless exploration with Appraisal
          </Text>

          <CustomButton 
            title="Continue with Email"
            handlePress={() => router.push('/sign-in')}
            containerStyles="w-full mt-7"
          />
        </View>
      </ScrollView>

      <StatusBar 
        backgroundColor='#161622'
        style='light'
      />
    </SafeAreaView>
  );
}