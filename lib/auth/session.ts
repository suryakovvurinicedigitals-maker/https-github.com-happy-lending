import { cookies } from "next/headers";
import { getIronSession, SessionOptions } from "iron-session";

export interface SessionData {
  profileId?: number;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: "happy-lending-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function requireProfileId(): Promise<number> {
  const session = await getSession();
  if (!session.profileId) {
    throw new Error("Not logged in.");
  }
  return session.profileId;
}
