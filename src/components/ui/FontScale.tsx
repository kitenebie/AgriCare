import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, forwardRef, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { StyleSheet, Text as NativeText, TextInput as NativeTextInput } from 'react-native';
import type { StyleProp, TextProps, TextInputProps, TextStyle } from 'react-native';

export type FontSizeChoice = 'small' | 'medium' | 'large' | 'extraLarge' | 'doubleExtraLarge';

export const FONT_SIZE_CHOICES: { value: FontSizeChoice; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'extraLarge', label: 'Extra Large' },
  { value: 'doubleExtraLarge', label: '2x Extra Large' },
];

const FONT_SIZE_KEY = '@agricare_font_size';
const FONT_SCALE: Record<FontSizeChoice, number> = { small: 0.9, medium: 1, large: 1.2, extraLarge: 1.4, doubleExtraLarge: 1.6 };
const FontScaleContext = createContext({ choice: 'medium' as FontSizeChoice, scale: 1, setChoice: async (_choice: FontSizeChoice) => {} });
const NestedTextContext = createContext(false);

export function FontScaleProvider({ children }: PropsWithChildren) {
  const [choice, setChoiceState] = useState<FontSizeChoice>('medium');

  useEffect(() => {
    AsyncStorage.getItem(FONT_SIZE_KEY).then(value => {
      if (value === 'small' || value === 'medium' || value === 'large' || value === 'extraLarge' || value === 'doubleExtraLarge') setChoiceState(value);
    }).catch(error => console.warn('Font size preference load failed:', error));
  }, []);

  const setChoice = useCallback(async (value: FontSizeChoice) => {
    setChoiceState(value);
    try {
      await AsyncStorage.setItem(FONT_SIZE_KEY, value);
    } catch (error) {
      console.warn('Font size preference save failed:', error);
    }
  }, []);

  const context = useMemo(() => ({ choice, scale: FONT_SCALE[choice], setChoice }), [choice, setChoice]);
  return <FontScaleContext.Provider value={context}>{children}</FontScaleContext.Provider>;
}

export const useFontScale = () => useContext(FontScaleContext);

function scaledTextStyle(style: StyleProp<TextStyle>, scale: number, useDefaultSize = false): TextStyle {
  const flattened = StyleSheet.flatten(style) || {};
  return {
    ...flattened,
    ...(typeof flattened.fontSize === 'number'
      ? { fontSize: flattened.fontSize * scale }
      : useDefaultSize ? { fontSize: 14 * scale } : {}),
    ...(typeof flattened.lineHeight === 'number' ? { lineHeight: flattened.lineHeight * scale } : {}),
  };
}

export const AppText = forwardRef<NativeText, TextProps>(({ children, style, ...props }, ref) => {
  const { scale } = useFontScale();
  const nested = useContext(NestedTextContext);
  return (
    <NativeText ref={ref} {...props} style={scaledTextStyle(style, scale, !nested)}>
      <NestedTextContext.Provider value>{children}</NestedTextContext.Provider>
    </NativeText>
  );
});

export const AppTextInput = forwardRef<NativeTextInput, TextInputProps>(({ style, ...props }, ref) => {
  const { scale } = useFontScale();
  return <NativeTextInput ref={ref} {...props} style={scaledTextStyle(style, scale, true)} />;
});
