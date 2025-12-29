import type { ReactNode } from 'react';
import type { BoxProps, FlexProps } from '@chakra-ui/react';

export type AuthInicialTab = 'login' | 'signup';

export type AuthLayoutProps = {
  onSuccessAction?: () => void;
  initialTab?: AuthInicialTab;

  /** Visual toggles / slots */

  signupSlot?: ReactNode;


  contentProps?: BoxProps;
  // NOTE: initialTab is accepted; if/when you add tabs, wire it here.
  // onSuccessAction can be passed to forms if you want to call a function after successful signup/signin.
};
