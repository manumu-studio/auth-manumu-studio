export default function ErrorPage({ searchParams }: { searchParams: { reason?: string } }) {
  const map = {
    expired: { title: "Verification link expired", body: "Request a new email to continue." },
    "not-found": { title: "Invalid verification link", body: "The link is invalid or already used." },
    "already-verified": { title: "Email already verified", body: "You can sign in now." },
    default: { title: "Verification error", body: "Please try again." },
  } as const;

  type ReasonKey = keyof typeof map;

  const reason: ReasonKey = (() => {
    switch (searchParams?.reason) {
      case "expired":
      case "not-found":
      case "already-verified":
      case "default":
        return searchParams.reason;
      default:
        return "default";
    }
  })();

  const { title, body } = map[reason];

  return (
    <main style={{ padding: 24 }}>
      <h1>❌ {title}</h1>
      <p>{body}</p>
    </main>
  );
}