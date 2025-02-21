import React from 'react';
import { Image, Platform, ImageSourcePropType, ImageProps } from 'react-native';

const inlineImageStyle = Platform.select({
  ios: {
    width: 136,
    height: 55,
    transform: [{ translateY: 40 }], // iOS requires transform for vertical adjustment
  },
  default: {
    width: 136,
    height: 55,
    marginBottom: -22, // Web/Android can use marginBottom
  },
});

interface ImageStyledProps extends ImageProps {
  source: ImageSourcePropType;
}

const ImageStyled: React.FC<ImageStyledProps> = ({ source, style, ...rest }) => {
  return (
    <Image
      source={source}
      resizeMode="contain"
      style={[inlineImageStyle, style]}
      {...rest}
    />
  );
};

export default ImageStyled;