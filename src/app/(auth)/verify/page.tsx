// src/app/(auth)/verify/page.tsx
import { redirect } from "next/navigation";
import { consumeVerificationToken } from "@/features/auth/server/verify/consumeToken";

export default async function VerifyPage(props: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await props.searchParams; // ← MUST await in Next 15
  if (!token) redirect("/verify/error?reason=not-found");

  const res = await consumeVerificationToken(token);
  if (res.ok) redirect("/verify/success");
  redirect(`/verify/error?reason=${res.reason}`);
}