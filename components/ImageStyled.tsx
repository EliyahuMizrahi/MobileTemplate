import React from 'react';
import { Image, ImageSourcePropType, ImageProps, Text, View } from 'react-native';
import { SvgProps } from 'react-native-svg';

// Default inline style for inline rendering.
const inlineImageStyle = {
  width: 136,
  height: 55,
};

type CustomImageSource = ImageSourcePropType | React.FC<SvgProps>;

interface ImageStyledProps extends Omit<ImageProps, 'source'> {
  source: CustomImageSource;
  inline?: boolean;
}

const ImageStyled: React.FC<ImageStyledProps> = ({ source, style, inline, ...rest }) => {
  // For block-level (own line) rendering, add centering.
  const blockCenterStyle = { alignSelf: 'center' };
  const combinedStyle = inline
    ? [inlineImageStyle, style]
    : [inlineImageStyle, blockCenterStyle, style];

  // If inline is requested, wrap the rendered content in a Text element so it behaves like text.
  if (inline) {
    if (typeof source === 'function') {
      const SvgComponent = source as React.FC<SvgProps>;
      return (
        <Text style={{ lineHeight: inlineImageStyle.height, textAlignVertical: 'center' }}>
          <SvgComponent width={inlineImageStyle.width} height={inlineImageStyle.height} {...(rest as any)} />
        </Text>
      );
    }
    return (
      <Text style={{ lineHeight: inlineImageStyle.height, textAlignVertical: 'center' }}>
        <Image
          source={source as ImageSourcePropType}
          resizeMode="contain"
          style={combinedStyle}
          {...rest}
        />
      </Text>
    );
  }

  // Default block-level rendering (centered) if not inline.
  if (typeof source === 'function') {
    const SvgComponent = source as React.FC<SvgProps>;
    return (
      <View style={{ alignSelf: 'center' }}>
        <SvgComponent width={inlineImageStyle.width} height={inlineImageStyle.height} {...(rest as any)} />
      </View>
    );
  }

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
