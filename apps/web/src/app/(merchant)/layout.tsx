import { headers } from "next/headers";
import { redirect } from "next/navigation";
import MerchantShell from "@/components/MerchantShell";
import { auth } from "@/lib/auth";

export default async function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "MERCHANT" && role !== "ADMIN") {
    redirect("/");
  }

  return <MerchantShell>{children}</MerchantShell>;
}
