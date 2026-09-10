import React from 'react';
import { Text, TextProps, TouchableOpacity, StyleProp, TextStyle } from 'react-native';
import { useTooltip } from '../../context/TooltipContext';

export interface TooltipTextProps extends TextProps {
  tooltipTitle?: string;
  disableTooltip?: boolean;
  textStyle?: StyleProp<TextStyle>;
}

export const TooltipText: React.FC<TooltipTextProps> = ({
  children,
  numberOfLines = 1,
  ellipsizeMode = 'tail',
  tooltipTitle,
  disableTooltip = false,
  onPress,
  style,
  ...rest
}) => {
  const { showTooltip } = useTooltip();

  const textContent = Array.isArray(children)
    ? children.join('')
    : typeof children === 'string' || typeof children === 'number'
    ? String(children)
    : '';

  const handlePress = (e: any) => {
    if (onPress) {
      onPress(e);
    }
    if (!disableTooltip && textContent) {
      showTooltip(textContent, tooltipTitle);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      disabled={disableTooltip && !onPress}
      style={{ flexShrink: 1 }}
    >
      <Text
        numberOfLines={numberOfLines}
        ellipsizeMode={ellipsizeMode}
        style={style}
        {...rest}
      >
        {children}
      </Text>
    </TouchableOpacity>
  );
};
