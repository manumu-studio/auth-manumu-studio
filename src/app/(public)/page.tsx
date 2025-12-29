"use client";

import { ReactNode, useState } from "react";
import {
  Box,
  Container,
  Heading,
  VStack,
  Text,
  useToast,
  Link as ChakraLink,
  useDisclosure,
} from "@chakra-ui/react";
import NextLink from "next/link";

import AuthModal from "@/features/auth/components/AuthModal";
import UserCard from "@/features/auth/components/UserCard";
import { useSession } from "next-auth/react";

import { AuthProvidersGroup, GoogleButton, GitHubButton } from "@/features/auth/components/ProviderButtons";
import SignInForm from "@/features/auth/components/SignInForm/SignInForm";

function EmailFormCard() {
  const toast = useToast();
  const [justSignedIn, setJustSignedIn] = useState(false);

  return (
    <Box>
      <SignInForm
        onSuccess={() => {
          setJustSignedIn(true);
          toast({
            title: "Signed in",
            description: "Welcome back!",
            status: "success",
            position: "top",
          });
        }}
        onError={(msg) =>
          toast({
            title: "Sign in failed",
            description: msg || "Please check your credentials.",
            status: "error",
            position: "top",
          })
        }
      />
      {justSignedIn ? (
        <Text mt={3} fontSize="sm" color="gray.500">
          You’re signed in — you can close this panel.
        </Text>
      ) : null}
    </Box>
  );
}

export default function PublicHomePage(): ReactNode {
  const { status } = useSession();
  const isAuthed = status === "authenticated";

  const {
    isOpen: isAuthOpen,
    onOpen: onAuthOpen,
    onClose: onAuthClose,
  } = useDisclosure();
  const [initialTab, setInitialTab] = useState<"login" | "signup">("login");

  const openSignup = () => {
    setInitialTab("signup");
    onAuthOpen();
  };

  if (isAuthed) {
    return (
      <Container maxW="container.md" py={12}>
        <VStack minH="50vh" align="center" justify="center" spacing={6}>
          <Heading size="lg" textAlign="center">Welcome back</Heading>
          <UserCard />
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="lg" py={16}>
      <VStack spacing={8} align="stretch">
        <Heading textAlign="center">Welcome to Manumu Authentication</Heading>

        <AuthProvidersGroup
          topCtaLabel="Sign In With Email"
          googleSlot={
            <>
              <GoogleButton
                label="Log In With Google"
                callbackUrl="/"
                className="darkBtn"
              />
              <GitHubButton
                label="Log In With GitHub"
                callbackUrl="/"
                className="darkBtn"
              />
            </>
          }
          footerSlot={
            <Text textAlign="center" color="gray.500" mt={2}>
              New here?{" "}
              <ChakraLink as={NextLink} href="#" onClick={(e: React.MouseEvent<HTMLAnchorElement>) => { e.preventDefault(); openSignup(); }}>
                Create Account
              </ChakraLink>
            </Text>
          }
        >
          <EmailFormCard />
        </AuthProvidersGroup>

        <AuthModal
          isOpen={isAuthOpen}
          onCloseAction={onAuthClose}
          initialTab={initialTab}
        />
      </VStack>
    </Container>
  );
}
