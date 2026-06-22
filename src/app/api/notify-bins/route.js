import { NextResponse } from "next/server";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || "admin@ebin.app";
const FROM_EMAIL     = process.env.FROM_EMAIL     || "eBin Alerts <alerts@ebin.app>";

export async function POST(req) {
  const { bins } = await req.json();

  if (!bins || bins.length === 0) {
    return NextResponse.json({ ok: false, message: "No bins provided." }, { status: 400 });
  }

  // Build HTML table rows
  const rows = bins.map(b => {
    const pct  = b.capacityKg > 0 ? Math.round((b.currentWeightKg / b.capacityKg) * 100) : 0;
    const color = b.status === "full" ? "#ef4444" : "#f59e0b";
    const label = b.status?.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase());
    return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">${b.locationName}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">${b.address || "—"}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">${b.currentWeightKg ?? 0} kg / ${b.capacityKg} kg</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">
          <span style="background:${color};color:#fff;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600;">${label} (${pct}%)</span>
        </td>
      </tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><title>eBin Alert</title></head>
<body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#f6f6f6;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
        <!-- Header -->
        <tr><td style="background:#16a34a;padding:24px 32px;">
          <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">⚠️ eBin Capacity Alert</h1>
          <p style="color:#bbf7d0;margin:6px 0 0;font-size:14px;">
            ${bins.length} bin${bins.length > 1 ? "s" : ""} need${bins.length === 1 ? "s" : ""} immediate attention
          </p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:28px 32px;">
          <p style="color:#374151;font-size:15px;margin:0 0 20px;">
            The following eBin locations have reached <strong>Almost Full</strong> or <strong>Full</strong> capacity and require collection or maintenance:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;border-bottom:1px solid #e5e7eb;">LOCATION</th>
                <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;border-bottom:1px solid #e5e7eb;">ADDRESS</th>
                <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;border-bottom:1px solid #e5e7eb;">WEIGHT</th>
                <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;border-bottom:1px solid #e5e7eb;">STATUS</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <p style="color:#6b7280;font-size:13px;margin:20px 0 0;">
            Please log in to the eBin Admin Panel to update the bin status after collection.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:16px 32px;border-top:1px solid #f0f0f0;text-align:center;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">eBin E-Waste Management System · Automated Alert</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // If no Resend key, return success with the bins data (for preview / testing)
  if (!RESEND_API_KEY) {
    return NextResponse.json({
      ok: true,
      simulated: true,
      message: `[Simulated] Alert for ${bins.length} bin(s) would be sent to ${ADMIN_EMAIL}. Add RESEND_API_KEY to .env.local to enable real emails.`,
      bins,
    });
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [ADMIN_EMAIL],
        subject: `⚠️ eBin Alert: ${bins.length} bin${bins.length > 1 ? "s" : ""} need attention`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ ok: false, message: err }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: `Alert sent to ${ADMIN_EMAIL}` });
  } catch (e) {
    return NextResponse.json({ ok: false, message: String(e) }, { status: 500 });
  }
}
