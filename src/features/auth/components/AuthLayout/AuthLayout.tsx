'use client';

import type { ReactNode } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import styles from './AuthLayout.module.scss';
import type { AuthLayoutProps } from './AuthLayout.types';

import AuthHeroImage from '../shared/AuthHeroImage/AuthHeroImage';
import SignInForm from '../SignInForm';
import SignupForm from '../SignupForm'; // if you want to support initialTab='signup'

export default function AuthLayout({
  onSuccessAction,
  initialTab,
  showImage = true,
  imageSlot,
  signupSlot,
  containerProps,
  imageProps,
  contentProps,
}: AuthLayoutProps) {
  const ImageArea: ReactNode = imageSlot ?? <AuthHeroImage />;

  const defaultForm =
    initialTab === 'signup'
      ? <SignupForm onSuccess={onSuccessAction} />
      : <SignInForm />;

  const ContentArea: ReactNode = signupSlot ?? defaultForm;

  return (
    <Flex
      className={styles.container}
      {...containerProps}
      direction={{ base: 'column', md: 'row' }}
      gap={0}
    >
      {showImage && (
        <Box
          className={styles.image}
          display={{ base: 'none', md: 'block' }}
          w={{ md: '45%' }}
          {...imageProps}
        >
          {ImageArea}
        </Box>
      )}

      <Box
        className={styles.content}
        w={{ base: '100%', md: showImage ? '55%' : '100%' }}
        p={{ base: 6, md: 8 }}
        {...contentProps}
      >
        {ContentArea}
      </Box>
    </Flex>
  );
}