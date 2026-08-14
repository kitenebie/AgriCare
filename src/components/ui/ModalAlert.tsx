import React, { useEffect, useCallback } from 'react';


import {


  View, Text, StyleSheet, TouchableOpacity, Modal, Pressable,


  Dimensions, BackHandler,


} from 'react-native';


import Animated, {


  useSharedValue, useAnimatedStyle, withSpring, withTiming,


  runOnJS, FadeIn, FadeOut,


} from 'react-native-reanimated';


import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';


import { Icon } from './Icon';


import type { IconName } from './Icon';





const { width: SCREEN_WIDTH } = Dimensions.get('window');





// ─── Types ───


export interface ModalAlertButton {


  text: string;


  style?: 'default' | 'cancel' | 'destructive';


  onPress?: () => void;


}





interface ModalAlertConfig {


  title: string;


  message?: string;


  buttons?: ModalAlertButton[];


  type?: 'success' | 'error' | 'warning' | 'info' | 'confirm';


}





interface ModalAlertState {


  visible: boolean;


  config: ModalAlertConfig | null;


}





// ─── Global state & resolver ───


let _setState: ((state: ModalAlertState) => void) | null = null;





/**


 * Drop-in replacement for Alert.alert()


 * Usage: modalAlert('Title', 'Message', [{ text: 'OK' }])


 * Or:    modalAlert('Error', 'Something went wrong.')


 */


export function modalAlert(


  title: string,


  message?: string,


  buttons?: ModalAlertButton[],


  type?: 'success' | 'error' | 'warning' | 'info' | 'confirm',


) {


  const inferredType = type || inferType(title, buttons);


  const config: ModalAlertConfig = { title, message, buttons, type: inferredType };


  if (_setState) {


    _setState({ visible: true, config });


  }


}





function inferType(title: string, buttons?: ModalAlertButton[]): ModalAlertConfig['type'] {


  const t = title.toLowerCase();


  if (t.includes('error') || t.includes('failed')) return 'error';


  if (t.includes('success') || t.includes('done') || t.includes('enabled') || t.includes('updated') || t.includes('accepted')) return 'success';


  if (t.includes('warning') || t.includes('⚠')) return 'warning';


  if (buttons && buttons.length >= 2 && buttons.some(b => b.style === 'destructive' || b.style === 'cancel')) return 'confirm';


  if (t.includes('delete') || t.includes('log out') || t.includes('report') || t.includes('decline') || t.includes('ban')) return 'confirm';


  return 'info';


}





function getTypeConfig(type: ModalAlertConfig['type']) {


  switch (type) {


    case 'success':


      return { icon: 'check-circle' as IconName, color: Colors.success, bgTint: '#E8F5E9' };


    case 'error':


      return { icon: 'alert-circle' as IconName, color: Colors.error, bgTint: '#FFEBEE' };


    case 'warning':


      return { icon: 'alert-triangle' as IconName, color: Colors.warning, bgTint: '#FFF3E0' };


    case 'confirm':


      return { icon: 'help-circle' as IconName, color: Colors.primary, bgTint: '#E8F5E9' };


    default:


      return { icon: 'info' as IconName, color: Colors.info, bgTint: '#E3F2FD' };


  }


}





// ─── Provider Component (place in _layout.tsx) ───


export const ModalAlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {


  const [state, setState] = React.useState<ModalAlertState>({ visible: false, config: null });


  const scale = useSharedValue(0.85);


  const opacity = useSharedValue(0);





  useEffect(() => {


    _setState = setState;


    return () => { _setState = null; };


  }, []);





  useEffect(() => {


    if (state.visible) {


      scale.value = withSpring(1, { damping: 14, stiffness: 180 });


      opacity.value = withTiming(1, { duration: 200 });


    }


  }, [state.visible]);





  // Handle Android back button


  useEffect(() => {


    if (!state.visible) return;


    const handler = BackHandler.addEventListener('hardwareBackPress', () => {


      handleDismiss();


      return true;


    });


    return () => handler.remove();


  }, [state.visible]);





  const handleDismiss = useCallback(() => {


    scale.value = withTiming(0.85, { duration: 150 });


    opacity.value = withTiming(0, { duration: 150 }, (finished) => {


      if (finished) runOnJS(setState)({ visible: false, config: null });


    });


  }, []);





  const handleButtonPress = useCallback((button?: ModalAlertButton) => {


    scale.value = withTiming(0.85, { duration: 150 });


    opacity.value = withTiming(0, { duration: 150 }, (finished) => {


      if (finished) {


        runOnJS(setState)({ visible: false, config: null });


        if (button?.onPress) runOnJS(button.onPress)();


      }


    });


  }, []);





  const animatedContainer = useAnimatedStyle(() => ({


    transform: [{ scale: scale.value }],


    opacity: opacity.value,


  }));





  if (!state.config) return <>{children}</>;





  const { title, message, buttons, type } = state.config;


  const typeConfig = getTypeConfig(type);


  const displayButtons = buttons && buttons.length > 0 ? buttons : [{ text: 'OK', style: 'default' as const }];





  return (


    <>


      {children}


      <Modal


        visible={state.visible}


        transparent


        animationType="none"


        statusBarTranslucent


        onRequestClose={handleDismiss}


      >


        <Pressable style={styles.overlay} onPress={handleDismiss}>


          <Animated.View style={[styles.modalContainer, animatedContainer]}>


            <Pressable style={styles.innerContent} onPress={(e) => e.stopPropagation()}>


              {/* Icon Header */}


              <View style={[styles.iconCircle, { backgroundColor: typeConfig.bgTint }]}>  


                <Icon name={typeConfig.icon} size={32} color={typeConfig.color} />


              </View>





              {/* Title */}


              <Text style={styles.title}>{title}</Text>





              {/* Message */}


              {message ? <Text style={styles.message}>{message}</Text> : null}





              {/* Buttons */}


              <View style={[styles.buttonRow, displayButtons.length === 1 && styles.buttonRowSingle]}>


                {displayButtons.map((btn, index) => {


                  const isDestructive = btn.style === 'destructive';


                  const isCancel = btn.style === 'cancel';


                  const isPrimary = !isCancel && !isDestructive && (displayButtons.length === 1 || index === displayButtons.length - 1);





                  return (


                    <TouchableOpacity


                      key={index}


                      style={[


                        styles.button,


                        isPrimary && styles.buttonPrimary,


                        isDestructive && styles.buttonDestructive,


                        isCancel && styles.buttonCancel,


                        displayButtons.length === 1 && styles.buttonFull,


                        displayButtons.length > 1 && { flex: 1 },


                      ]}


                      onPress={() => handleButtonPress(btn)}


                      activeOpacity={0.7}


                    >


                      <Text


                        style={[


                          styles.buttonText,


                          isPrimary && styles.buttonTextPrimary,


                          isDestructive && styles.buttonTextDestructive,


                          isCancel && styles.buttonTextCancel,


                        ]}


                      >


                        {btn.text}


                      </Text>


                    </TouchableOpacity>


                  );


                })}


              </View>


            </Pressable>


          </Animated.View>


        </Pressable>


      </Modal>


    </>


  );


};





// ─── Styles ───


const styles = StyleSheet.create({


  overlay: {


    flex: 1,


    backgroundColor: 'rgba(0, 0, 0, 0.55)',


    justifyContent: 'center',


    alignItems: 'center',


    paddingHorizontal: Spacing.xxl,


  },
  innerContent: {
    width: '100%',
    alignItems: 'center',
  },


  modalContainer: {


    width: Math.min(SCREEN_WIDTH - 48, 340),


    backgroundColor: Colors.white,


    borderRadius: BorderRadius.lg + 4,


    paddingTop: Spacing.xxl,


    paddingBottom: Spacing.lg,


    paddingHorizontal: Spacing.xl,


    alignItems: 'center',


    ...Shadow.heavy,


  },


  iconCircle: {


    width: 64,


    height: 64,


    borderRadius: 32,


    justifyContent: 'center',


    alignItems: 'center',


    marginBottom: Spacing.md,


  },


  title: {


    fontSize: FontSize.xl,


    fontWeight: '700',


    color: Colors.text,


    textAlign: 'center',


    marginBottom: Spacing.sm,


  },


  message: {


    fontSize: FontSize.md,


    color: Colors.textSecondary,


    textAlign: 'center',


    lineHeight: 20,


    marginBottom: Spacing.lg,


    paddingHorizontal: Spacing.xs,


  },


  buttonRow: {


    flexDirection: 'row',


    gap: Spacing.sm,


    width: '100%',


    marginTop: Spacing.sm,


  },


  buttonRowSingle: {


    justifyContent: 'center',


  },


  button: {


    paddingVertical: Spacing.md + 2,


    paddingHorizontal: Spacing.lg,


    borderRadius: BorderRadius.xl,


    alignItems: 'center',


    justifyContent: 'center',


    minHeight: 46,


  },


  buttonFull: {


    width: '100%',


  },


  buttonPrimary: {


    backgroundColor: Colors.primary,


  },


  buttonDestructive: {


    backgroundColor: Colors.error,


  },


  buttonCancel: {


    backgroundColor: Colors.surface,


    borderWidth: 1,


    borderColor: Colors.border,


  },


  buttonText: {


    fontSize: FontSize.md,


    fontWeight: '600',


  },


  buttonTextPrimary: {


    color: Colors.white,


  },


  buttonTextDestructive: {


    color: Colors.white,


  },


  buttonTextCancel: {


    color: Colors.textSecondary,


  },


});


