import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

import { AuthForm } from "../_components/auth-form";

export default async function LoginPage() {
  // ログイン済みならクイズ画面へ
  if (await getServerSession(authOptions)) redirect("/");
  return <AuthForm mode="login" />;
}
