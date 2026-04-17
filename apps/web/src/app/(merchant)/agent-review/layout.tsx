import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function AgentReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const role = (session?.user as { role?: string })?.role;
  if (role !== "ADMIN") {
    redirect("/dashboard");
  }

  return children;
}
