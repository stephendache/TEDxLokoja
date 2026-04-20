import express from "express";
import { createServer as createViteServer } from "vite";
import QRCode from "qrcode";
import { Resend } from "resend";
import path from "path";
import fs from "fs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Initialize Firebase Admin
let db: FirebaseFirestore.Firestore | null = null;
try {
  const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
  const adminApp = initializeApp({
    projectId: firebaseConfig.projectId,
  });
  db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId || '(default)');
} catch (error) {
  console.error("Failed to initialize Firebase Admin:", error);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/confirm-payment", async (req, res) => {
    try {
      const { userId, ticketTypeId, amount, reference, email, name, ticketName } = req.body;

      if (!db) {
        throw new Error("Database not initialized");
      }

      // 1. Run a transaction to ensure ticket availability and create purchase
      await db.runTransaction(async (t) => {
        const ticketRef = db!.collection('ticketTypes').doc(ticketTypeId);
        const ticketDoc = await t.get(ticketRef);

        if (!ticketDoc.exists) {
          throw new Error("Ticket type does not exist.");
        }

        const ticketData = ticketDoc.data();
        if (!ticketData || ticketData.available <= 0) {
          throw new Error("Tickets are sold out.");
        }

        // Decrement availability
        t.update(ticketRef, {
          available: FieldValue.increment(-1)
        });

        // Record purchase
        const purchaseRef = db!.collection('purchases').doc();
        t.set(purchaseRef, {
          userId,
          ticketTypeId,
          amount,
          status: 'success',
          reference,
          createdAt: FieldValue.serverTimestamp()
        });
      });

      // 2. Send Email
      const qrCodeDataUrl = await QRCode.toDataURL(reference);

      if (!process.env.RESEND_API_KEY) {
        console.warn("RESEND_API_KEY is not set. Skipping email sending.");
        return res.json({ success: true, message: "Payment confirmed, email skipped (no API key)", qrCodeUrl: qrCodeDataUrl });
      }

      const resend = new Resend(process.env.RESEND_API_KEY);

      const { data, error } = await resend.emails.send({
        from: "TEDx Lokoja <onboarding@resend.dev>",
        to: [email],
        subject: `Your TEDx Lokoja Ticket: ${ticketName}`,
        html: `
          <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
            <h1 style="color: #dc2626;">TEDx Lokoja</h1>
            <h2>Hi ${name},</h2>
            <p>Thank you for purchasing a ticket for TEDx Lokoja!</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Ticket Type:</strong> ${ticketName}</p>
              <p style="margin: 0;"><strong>Reference:</strong> ${reference}</p>
            </div>
            <p>Please present the QR code below at the event entrance:</p>
            <img src="${qrCodeDataUrl}" alt="Ticket QR Code" style="width: 200px; height: 200px;" />
            <p>See you there!</p>
          </div>
        `,
      });

      if (error) {
        console.error("Resend error:", error);
        return res.json({ success: true, message: "Payment confirmed, but email failed to send.", qrCodeUrl: qrCodeDataUrl });
      }

      res.json({ success: true, data, qrCodeUrl: qrCodeDataUrl });
    } catch (error: any) {
      console.error("Confirmation error:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
