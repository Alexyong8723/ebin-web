import { NextResponse } from "next/server";
import { createQrToken } from "@/lib/firestore";

export async function POST(req) {
  try {
    const { binId, binName, points, label, estimatedWeightKg } = await req.json();

    if (!binId || !binName || !points) {
      return NextResponse.json(
        { error: "Missing required fields: binId, binName, or points" },
        { status: 400 }
      );
    }

    const { token } = await createQrToken({
      binId,
      binName,
      points,
      label: label || "E-Waste Drop-off",
      estimatedWeightKg,
    });

    return NextResponse.json({ token });
  } catch (err) {
    console.error("generate-qr error:", err);
    return NextResponse.json(
      { error: "Failed to generate QR token.", details: err.message },
      { status: 500 }
    );
  }
}
