import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Generate a random nonce
  const nonce = crypto.randomUUID().replace(/-/g, "");

  // Store the nonce in a cookie - await the cookies function
  const cookieStore = await cookies();
  cookieStore.set("siwe", nonce, { 
    secure: true,
    httpOnly: true,
    sameSite: "strict",
    maxAge: 60 * 10 
  });

  // Return the response
  return NextResponse.json({ nonce });
}