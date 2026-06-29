module.exports = ({ env }) => ({
  email: {
    config: {
      provider: 'strapi-provider-email-resend',
      providerOptions: {
        apiKey: env('RESEND_API_KEY', 're_...'),
      },
      settings: {
        defaultFrom: env('RESEND_DEFAULT_FROM', 'your-verified-email@domain.com'),
        defaultReplyTo: env('RESEND_DEFAULT_FROM', 'your-verified-email@domain.com'),
      },
    },
  },
  upload: {
    config: {
      provider: 'cloudinary',
      providerOptions: {
        cloud_name: env('CLOUDINARY_NAME'),
        api_key: env('CLOUDINARY_KEY'),
        api_secret: env('CLOUDINARY_SECRET'),
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
    },
  },
});

