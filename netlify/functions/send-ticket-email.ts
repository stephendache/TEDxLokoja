import { Handler } from '@netlify/functions';
import nodemailer from 'nodemailer';

// Configure the nodemailer transporter using Gmail
// Wait to initialize this inside or outside the handler? Outside is fine as long as env vars exist.
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER, // Your Gmail address (e.g., paulstephenedache@gmail.com)
    pass: process.env.GMAIL_PASS, // Your Gmail App Password (NOT your regular password)
  },
});

export const handler: Handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Prevent crashes if the body is completely empty
  if (!event.body) {
    return { statusCode: 400, body: 'Empty payload' };
  }

  try {
    const { email, name, ticketName, reference } = JSON.parse(event.body);

    if (!email || !reference) {
      return { statusCode: 400, body: 'Missing required fields' };
    }

    // Generate a QR Code URL using a reliable free API
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(reference)}`;

    // Send the email using Nodemailer
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
              <img src="${qrCodeUrl}" alt="Ticket QR Code" style="width: 200px; height: 200px; border-radius: 8px; border: 1px solid #eeeeee;" />
            </div>
            
            <p style="font-size: 16px; font-weight: bold; text-align: center;">Start Where You Are. We can't wait to see you there!</p>
          </div>
          <div style="background-color: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e5e5;">
            &copy; 2026 TEDx Lokoja. All rights reserved.
          </div>
        </div>
      `,
    };

    if (process.env.ADMIN_EMAIL) {
      mailOptions.cc = process.env.ADMIN_EMAIL;
    }

    const info = await transporter.sendMail(mailOptions);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, messageId: info.messageId }),
    };

  } catch (error: unknown) {
    console.error("Function execution error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }),
    };
  }
};
