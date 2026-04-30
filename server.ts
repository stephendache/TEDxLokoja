import express from "express";
import { createServer as createViteServer } from "vite";
import QRCode from "qrcode";
import nodemailer from "nodemailer";
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

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

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
      const base64Data = qrCodeDataUrl.split(',')[1];

      if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
        console.warn("GMAIL_USER or GMAIL_PASS is not set. Skipping email sending.");
        return res.json({ success: true, message: "Payment confirmed, email skipped (credentials missing)", qrCodeUrl: qrCodeDataUrl });
      }

      const mailOptions: any = {
        from: `"TEDx Lokoja" <${process.env.GMAIL_USER}>`,
        to: email, // Send to the attendee
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
            <img src="cid:qrcode" alt="Ticket QR Code" style="width: 200px; height: 200px;" />
            <p>See you there!</p>
          </div>
        `,
        attachments: [{
          filename: 'qrcode.png',
          content: base64Data,
          encoding: 'base64',
          cid: 'qrcode'
        }]
      };

      if (process.env.ADMIN_EMAIL) {
        mailOptions.cc = process.env.ADMIN_EMAIL;
      }

      try {
        const info = await transporter.sendMail(mailOptions);
        res.json({ success: true, data: info, qrCodeUrl: qrCodeDataUrl });
      } catch (error) {
        console.error("Nodemailer error:", error);
        return res.json({ success: true, message: "Payment confirmed, but email failed to send.", qrCodeUrl: qrCodeDataUrl });
      }
    } catch (error: unknown) {
      console.error("Confirmation error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Internal Server Error" });
    }
  });

  app.post("/api/send-merch-email", async (req, res) => {
    try {
      const { email, name, itemName, reference } = req.body;

      if (!email || !reference || !itemName) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const qrCodeDataUrl = await QRCode.toDataURL(reference);
      const base64Data = qrCodeDataUrl.split(',')[1];

      if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
        console.warn("GMAIL_USER or GMAIL_PASS is not set. Skipping email sending.");
        return res.json({ success: true, message: "Email skipped (credentials missing)" });
      }

      const mailOptions: any = {
        from: `"TEDx Lokoja" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: `Your TEDx Lokoja Merch: ${itemName}`,
        html: `
          <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #111827; padding: 20px; color: white; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">TEDx Lokoja Official Store</h1>
            </div>
            <div style="padding: 30px; background-color: #ffffff; color: #333333;">
              <h2 style="margin-top: 0;">Hi ${name},</h2>
              <p style="font-size: 16px; line-height: 1.5;">Thank you for your purchase! Your order has been successfully placed.</p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <p style="margin: 0 0 10px 0; font-size: 16px;"><strong>Item:</strong> ${itemName}</p>
                <p style="margin: 0; font-size: 16px;"><strong>Reference Code:</strong> <span style="font-family: monospace; font-size: 18px;">${reference}</span></p>
              </div>
              
              <p style="text-align: center; font-size: 16px; margin-bottom: 20px;">Please present the QR code below at the merch collection stand:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <img src="cid:qrcode" alt="Merch QR Code" style="width: 200px; height: 200px; border-radius: 8px; border: 1px solid #eeeeee;" />
              </div>
              
              <p style="font-size: 16px; font-weight: bold; text-align: center;">Start Where You Are. See you soon!</p>
            </div>
            <div style="background-color: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e5e5;">
              &copy; 2026 TEDx Lokoja. All rights reserved.
            </div>
          </div>
        `,
        attachments: [{
          filename: 'qrcode.png',
          content: base64Data,
          encoding: 'base64',
          cid: 'qrcode'
        }]
      };

      if (process.env.ADMIN_EMAIL) {
        mailOptions.cc = process.env.ADMIN_EMAIL;
      }

      const info = await transporter.sendMail(mailOptions);
      res.json({ success: true, data: info });
    } catch (error: unknown) {
      console.error("Nodemailer error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Internal Server Error" });
    }
  });

  app.post("/api/send-ticket-email", async (req, res) => {
    try {
      const { email, name, ticketName, reference } = req.body;

      if (!email || !reference || !ticketName) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const qrCodeDataUrl = await QRCode.toDataURL(reference);
      const base64Data = qrCodeDataUrl.split(',')[1];

      if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
        console.warn("GMAIL_USER or GMAIL_PASS is not set. Skipping email sending.");
        return res.json({ success: true, message: "Email skipped (credentials missing)" });
      }

      const mailOptions: any = {
        from: `"TEDx Lokoja" <${process.env.GMAIL_USER}>`,
        to: email, // Send to the attendee
        subject: `Your TEDx Lokoja Ticket: ${ticketName}`,
        html: `
          <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #dc2626; padding: 20px; color: white; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">TEDx Lokoja</h1>
            </div>
            <div style="padding: 30px; background-color: #ffffff; color: #333333;">
              <h2 style="margin-top: 0;">Hi ${name},</h2>
              <p style="font-size: 16px; line-height: 1.5;">Thank you for purchasing a ticket for TEDx Lokoja! Your spot is secured.</p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <p style="margin: 0 0 10px 0; font-size: 16px;"><strong>Ticket Type:</strong> ${ticketName}</p>
                <p style="margin: 0; font-size: 16px;"><strong>Reference Code:</strong> <span style="font-family: monospace; font-size: 18px;">${reference}</span></p>
              </div>
              
              <p style="text-align: center; font-size: 16px; margin-bottom: 20px;">Please present the QR code below at the event entrance:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <img src="cid:qrcode" alt="Ticket QR Code" style="width: 200px; height: 200px; border-radius: 8px; border: 1px solid #eeeeee;" />
              </div>
              
              <p style="font-size: 16px; font-weight: bold; text-align: center;">Start Where You Are. We can't wait to see you there!</p>
            </div>
            <div style="background-color: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e5e5;">
              &copy; 2026 TEDx Lokoja. All rights reserved.
            </div>
          </div>
        `,
        attachments: [{
          filename: 'qrcode.png',
          content: base64Data,
          encoding: 'base64',
          cid: 'qrcode'
        }]
      };

      if (process.env.ADMIN_EMAIL) {
        mailOptions.cc = process.env.ADMIN_EMAIL;
      }

      const info = await transporter.sendMail(mailOptions);
      res.json({ success: true, data: info });
    } catch (error: unknown) {
      console.error("Nodemailer error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Internal Server Error" });
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
