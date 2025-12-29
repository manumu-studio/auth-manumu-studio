'use client';

import type { ReactNode } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import styles from './AuthLayout.module.scss';
import type { AuthLayoutProps } from './AuthLayout.types';

import SignInForm from '../SignInForm';
import SignupForm from '../SignupForm'; // if you want to support initialTab='signup'

export default function AuthLayout({
  onSuccessAction,
  initialTab,
  signupSlot,
  contentProps,
}: AuthLayoutProps) {

  const defaultForm =
    initialTab === 'signup'
      ? <SignupForm onSuccess={onSuccessAction} />
      : <SignInForm />;

  const ContentArea: ReactNode = signupSlot ?? defaultForm;

  return (

      <Box
        className={styles.content}
        p={{ base: 6, md: 8 }}
        {...contentProps}
      >
        {ContentArea}
      </Box>

  );
}