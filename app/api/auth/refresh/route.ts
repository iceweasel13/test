// app/api/auth/refresh/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET environment variable is not set"
  );
}

export async function POST(req: NextRequest) {
  const refreshToken =
    req.cookies.get("refreshToken")?.value;
  if (!refreshToken) {
    return NextResponse.json(
      { error: "No refresh token" },
      { status: 401 }
    );
  }
  // Refresh token'ı doğrula (örneğin, Supabase'te saklanan bir token ile)
  try {
    const newToken = jwt.sign(
      { sub: "user-id", wallet_address: "0xabc..." },
      JWT_SECRET!,
      { expiresIn: "24h" }
    );
    return NextResponse.json({ token: newToken });
  } catch {
    return NextResponse.json(
      { error: "Invalid refresh token" },
      { status: 403 }
    );
  }
}
