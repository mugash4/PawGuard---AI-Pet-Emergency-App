const functions = require('firebase-functions');
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');

admin.initializeApp();

// Configure your email service
// You can use Gmail with app password or any SMTP service
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your-app-email@gmail.com', // Create a dedicated Gmail for the app
    pass: 'your-app-password' // Use App Password from Google Account settings
  }
});

// Cloud Function to send email when ticket is created
exports.sendSupportEmail = functions.firestore
  .document('supportTickets/{ticketId}')
  .onCreate(async (snap, context) => {
    const ticketData = snap.data();
    
    // Only send email if it needs human support
    if (!ticketData.needsHuman) {
      return null;
    }

    const emailContent = `
      New Support Ticket: ${ticketData.ticketId}
      
      FROM: ${ticketData.userName} (${ticketData.userEmail})
      USER ID: ${ticketData.userId}
      CATEGORY: ${ticketData.category}
      
      QUERY:
      ${ticketData.query}
      
      ${ticketData.aiResponse ? `AI ATTEMPTED RESPONSE:\n${ticketData.aiResponse}\n\n` : ''}
      
      Status: ${ticketData.status}
      Created: ${ticketData.createdAt}
      
      ---
      PawGuard Support System
    `;

    const mailOptions = {
      from: '"PawGuard Support" <your-app-email@gmail.com>',
      to: 'augustinemwathi96@gmail.com',
      subject: `[PawGuard] New Support Ticket #${ticketData.ticketId.substring(7, 17)}`,
      text: emailContent,
      replyTo: ticketData.userEmail
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('✅ Support email sent successfully');
      
      // Update ticket with email sent status
      await snap.ref.update({
        emailSent: true,
        emailSentAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('❌ Error sending support email:', error);
    }

    return null;
  });
