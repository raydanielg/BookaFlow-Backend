const nodemailer = require("nodemailer")
const config = require("../config/env")

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: false,
  requireTLS: true,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
})

async function sendMail({ to, subject, html, text }) {
  return transporter.sendMail({
    from: config.smtp.from,
    to,
    subject,
    html,
    text,
  })
}

module.exports = { sendMail, transporter }
