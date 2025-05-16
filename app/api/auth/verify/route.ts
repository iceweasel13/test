// app/api/auth/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(req: NextRequest) {
  const token = req.headers
    .get("authorization")
    ?.split(" ")[1];
  if (!token) {
    return NextResponse.json(
      { error: "Token required" },
      { status: 401 }
    );
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = {
      id: decoded.sub,
      wallet_address: decoded.wallet_address,
      // Diğer kullanıcı alanlarını Supabase'ten çekebilirsin
    };
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json(
      { error: "Invalid token" },
      { status: 403 }
    );
  }
}
