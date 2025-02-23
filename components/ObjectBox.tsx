import React from "react";
import { View, Text } from "react-native";

interface ObjectBoxProps {
  marginLeft: number;
  marginTop: number;
  width: number;
  height: number;
  label?: string;
  score?: number;
  className?: string;
}

export function ObjectBox({
  marginLeft,
  marginTop,
  width,
  height,
  label,
  score,
  className,
}: ObjectBoxProps) {
  return (
    <View
      className={`absolute ${className}`}
      style={{
        left: marginLeft,
        top: marginTop,
        width: width,
        height: height,
      }}
    >
      <Text className="text-xs text-white">
        {label} {score && Math.round(score * 100)}%
      </Text>
    </View>
  );
}