import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { User, SessionPayload } from "@/types";

const SECRET_KEY = process.env.JWT_SECRET || "default-secret-do-not-use-in-prod";
const key = new TextEncoder().encode(SECRET_KEY);

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ["HS256"],
  });
  return payload;
}

export async function getSession(): Promise<User | null> {
  const session = cookies().get("session")?.value;
  if (!session) return null;
  try {
    const parsed = await decrypt(session);
    return parsed.user as User;
  } catch (error) {
    return null;
  }
}

export async function setSession(user: User) {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  const session = await encrypt({ user, expires });

  cookies().set("session", session, {
    expires,
    httpOnly: true, // Not accessible via JavaScript on client
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export async function clearSession() {
  cookies().set("session", "", { expires: new Date(0) });
}