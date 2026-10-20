import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

import { UserBar } from "./_components/user-bar";
import { QuizApp } from "./quiz-app";

export default async function Page() {
  // クイズはログインした人だけが遊べる。ログインしていなければログイン画面へ
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  return (
    <>
      <UserBar email={session.user.email} />
      <QuizApp />
    </>
  );
}
