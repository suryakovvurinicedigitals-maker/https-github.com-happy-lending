"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export async function login(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const password = formData.get("password");

  if (typeof password !== "string" || password.length === 0) {
    return { error: "Password is required." };
  }

  if (password !== process.env.APP_PASSWORD) {
    return { error: "Incorrect password." };
  }

  const session = await getSession();
  session.isLoggedIn = true;
  await session.save();

  redirect("/");
}

export async function logout() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
