import React from 'react';
import { Image, Platform, ImageSourcePropType, ImageProps } from 'react-native';
import { SvgProps } from 'react-native-svg';

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

// Change 1: Create a union type that accepts both image sources and SVG components.
type CustomImageSource = ImageSourcePropType | React.FC<SvgProps>;

// Change 1: Update the interface to use the union type for the 'source' prop.
interface ImageStyledProps extends Omit<ImageProps, 'source'> {
  source: CustomImageSource;
}

const ImageStyled: React.FC<ImageStyledProps> = ({ source, style, ...rest }) => {
  const combinedStyle = [inlineImageStyle, style];

  // Change 2: Check if the source is an SVG component (a function) and render it accordingly.
  if (typeof source === 'function') {
    const SvgComponent = source as React.FC<SvgProps>;
    const dimensions = Platform.select({
      ios: { width: 136, height: 55 },
      default: { width: 136, height: 55 },
    }) || { width: 136, height: 55 };
    return <SvgComponent width={dimensions.width} height={dimensions.height} {...rest as any} />;
  }

  // Otherwise, render it as a normal image.
  return (
    <Image
      source={source as ImageSourcePropType}
      resizeMode="contain"
      style={combinedStyle}
      {...rest}
    />
  );
};

export default ImageStyled;