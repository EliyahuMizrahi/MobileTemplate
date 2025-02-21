import { View, ScrollView, Image, Text } from 'react-native'
import React, { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import logo from '../../assets/images/logo.png'
import FormField from '@/components/FormField'

const SignIn = () => {
  const [form, setForm] = useState({
    email: '',
    password: ''
  })  

  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView>
        <View className="w-full justify-center h-full px-4 my-6">
          <Image 
            source={logo}
            resizeMode="contain"
            style= {{ width: 115, height: 35 }}
          />

          <Text className="text-2xl text-white text-semibold mt-10 font-psemibold">
            Log in to Appraisal
          </Text>

          <FormField 
            title="Email"
            value={form.email}
            handleChangeText={(e) => setForm({ ...form, email: e })}
            otherStyles="mt-7"
            keyboardType="email-address" 
            placeHolder={''}          
          />

          <FormField 
            title="Password"
            value={form.password}
            handleChangeText={(e) => setForm({ ...form, password: e })}
            otherStyles="mt-7" 
            placeHolder={''}          
          />
        </View>
      </ScrollView>

     
    </SafeAreaView>
  )
}

export default SignIn