module.exports = {
  async afterCreate(event) {
    const { result } = event;

    try {
      await strapi.plugins['email'].services.email.send({
        to: 'acnwa1234@gmail.com', // Admin email
        replyTo: result.email || 'acnwa1234@gmail.com',
        subject: `New Portfolio Contact Message from ${result.fullName}`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 40px 20px; border-radius: 8px;">
            <div style="background-color: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border-top: 5px solid #14b8a6;">
              <h2 style="color: #1f2937; margin-top: 0; margin-bottom: 24px; font-size: 24px; text-align: center;">New Contact Message</h2>
              
              <p style="color: #4b5563; font-size: 16px; margin-bottom: 30px; text-align: center;">You have received a new message from your portfolio website.</p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <p style="margin: 0 0 10px 0; color: #374151;"><strong>Name:</strong> <span style="color: #111827;">${result.fullName}</span></p>
                <p style="margin: 0; color: #374151;"><strong>Email:</strong> <a href="mailto:${result.email}" style="color: #14b8a6; text-decoration: none;">${result.email}</a></p>
              </div>
              
              <div style="border-left: 4px solid #8b5cf6; padding-left: 15px; margin-bottom: 30px;">
                <h3 style="color: #374151; font-size: 16px; margin-top: 0; margin-bottom: 10px;">Message:</h3>
                <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${result.description}</p>
              </div>
              
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <a href="mailto:${result.email}" style="background-color: #14b8a6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reply to ${result.fullName.split(' ')[0]}</a>
              </div>
            </div>
            
            <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
              Sent securely via your Strapi Portfolio Backend
            </p>
          </div>
        `,
        text: `New Portfolio Contact Message
Name: ${result.fullName}
Email: ${result.email}

Message:
${result.description}
`,
      });
      strapi.log.info('Admin notification email sent successfully.');

      // Send auto-reply to the user
      if (result.email) {
        await strapi.plugins['email'].services.email.send({
          to: result.email,
          replyTo: 'acnwa1234@gmail.com', // Admin email for replies
          subject: `Thank you for your message, ${result.fullName.split(' ')[0]}!`,
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 40px 20px; border-radius: 8px;">
              <div style="background-color: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border-top: 5px solid #14b8a6;">
                <h2 style="color: #1f2937; margin-top: 0; margin-bottom: 24px; font-size: 24px; text-align: center;">Message Received!</h2>
                
                <p style="color: #4b5563; font-size: 16px; margin-bottom: 20px; line-height: 1.6;">
                  Hi ${result.fullName.split(' ')[0]},
                </p>
                
                <p style="color: #4b5563; font-size: 16px; margin-bottom: 30px; line-height: 1.6;">
                  Thank you so much for reaching out! I have received your message and will review it shortly. I'll get back to you as soon as possible, usually within a short time.
                </p>
                
                <p style="color: #4b5563; font-size: 16px; margin-bottom: 10px; line-height: 1.6;">
                  Looking forward to connecting with you!
                </p>
                
                <p style="color: #1f2937; font-size: 16px; font-weight: bold; margin-bottom: 0;">
                  Best regards,<br/>
                  Anayo Caleb
                </p>
              </div>
            </div>
          `,
          text: `Hi ${result.fullName.split(' ')[0]},

Thank you so much for reaching out! I have received your message and will review it shortly. I'll get back to you as soon as possible, usually within a short time.

Looking forward to connecting with you!

Best regards,
Anayo Caleb
`
        });
        strapi.log.info('Auto-reply email sent successfully to user.');
      }
    } catch (err) {
      strapi.log.error('Failed to send admin notification email:', err);
    }
  },
};
