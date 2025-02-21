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

// Extend the union type to also accept an object with a default property.
type CustomImageSource = 
  | ImageSourcePropType 
  | React.FC<SvgProps> 
  | { default: React.FC<SvgProps> };

interface ImageStyledProps extends Omit<ImageProps, 'source'> {
  source: CustomImageSource;
}

const ImageStyled: React.FC<ImageStyledProps> = ({ source, style, ...rest }) => {
  const combinedStyle = [inlineImageStyle, style];
  const dimensions = { width: 136, height: 55 };

  // Determine if the source is an SVG component.
  let SvgComponent: React.FC<SvgProps> | null = null;
  
  if (typeof source === 'function') {
    // Directly a function (React component)
    SvgComponent = source;
  } else if (
    typeof source === 'object' &&
    source !== null &&
    typeof (source as any).default === 'function'
  ) {
    // Imported as an object with a default function
    SvgComponent = (source as any).default;
  }
  
  if (SvgComponent) {
    return <SvgComponent width={dimensions.width} height={dimensions.height} {...(rest as any)} />;
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