require("dotenv").config()

module.exports = {
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  clientUrl: process.env.CLIENT_URL || "https://bookmiadi-web.vercel.app",
  jwt: {
    secret: process.env.JWT_SECRET || "change-me-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
  smtp: {
    host: process.env.SMTP_HOST || "mail.sars.ac.tz",
    port: parseInt(process.env.SMTP_PORT || "465", 10),
    user: process.env.SMTP_USER || "info@sars.ac.tz",
    pass: process.env.SMTP_PASS || "Sars@2026",
    from: process.env.SMTP_FROM || "BookMiadi <info@sars.ac.tz>",
  },
}
