const nodemailer = require("nodemailer")
const config = require("../config/env")

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465,
  requireTLS: config.smtp.port !== 465,
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
