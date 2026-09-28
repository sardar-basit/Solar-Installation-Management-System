import nodemailer from "nodemailer";

export async function sendEmail(to: string, subject: string, text: string) {
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "noreply@sims.local",
          to: [to],
          subject,
          text,
        }),
      });
      if (!res.ok) {
        console.error("Resend error", await res.text());
      }
      return;
    } catch (e) {
      console.error("Email send failed", e);
      return;
    }
  }

  if (process.env.SMTP_URL) {
    try {
      const transporter = nodemailer.createTransport(process.env.SMTP_URL);
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || "noreply@sims.local",
        to,
        subject,
        text,
      });
    } catch (e) {
      console.error("SMTP send failed", e);
    }
    return;
  }

  // Dev fallback: log only
  console.log(`[email:skipped] to=${to} subject=${subject}`);
}
