import { View, ScrollView, Image, Text } from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import logo from "../../assets/images/logo.png";
import FormField from "@/components/FormField";
import CustomButton from "@/components/CustomButton";
import { Link } from "expo-router";

const SignIn = () => {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [isSubmitting, setisSubmitting] = useState(false);

  const submit = () => {};

  return (
    <SafeAreaView className="bg-primary flex-1">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
      >
        <View className="w-full px-4 my-6">
          <View className="items-center">
            <Image
              source={logo}
              resizeMode="contain"
              style={{ width: 300, height: 90 }}
            />
          </View>

          <Text className="text-2xl text-white text-semibold mt-10 font-psemibold">
            Log in to Appraisal
          </Text>

          <FormField
            title="Email"
            value={form.email}
            handleChangeText={(e) => setForm({ ...form, email: e })}
            otherStyles="mt-7"
            keyboardType="email-address"
            placeHolder={""}
          />

          <FormField
            title="Password"
            value={form.password}
            handleChangeText={(e) => setForm({ ...form, password: e })}
            otherStyles="mt-7"
            placeHolder={""}
          />

          <CustomButton
            title="Sign In"
            handlePress={submit}
            containerStyles="mt-7"
            isLoading={isSubmitting}
          />

          <View className="justify-center pt-5 flex-row gap-2">
            <Text className="text-lg text-gray-100 font-pregular">
              Don't have an account?
            </Text>
            <Link
              href="/sign-up"
              className="text-lg font-psemibold text-secondary"
            >
              Sign Up
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignIn;
