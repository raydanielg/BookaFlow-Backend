const express = require("express")
const helmet = require("helmet")
const cors = require("cors")
const morgan = require("morgan")
const cookieParser = require("cookie-parser")
const swaggerUi = require("swagger-ui-express")

const config = require("./config/env")
const swaggerSpec = require("./config/swagger")
const { notFound, errorHandler } = require("./middleware/error")
const authRoutes = require("./routes/auth")
const businessRoutes = require("./routes/business")
const serviceRoutes = require("./routes/services")
const staffRoutes = require("./routes/staff")
const appointmentRoutes = require("./routes/appointments")
const customerRoutes = require("./routes/customers")
const bookingRoutes = require("./routes/booking")
const publicRoutes = require("./routes/public")
const eventRoutes = require("./routes/events")

const app = express()

app.set("trust proxy", 1)

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}))
app.use(
  cors({
    origin: true,
    credentials: true,
  })
)
app.use(morgan("dev"))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() })
})

// Test SMTP endpoint
app.post("/api/test-email", async (req, res) => {
  try {
    const { sendMail } = require("./utils/mailer")
    const { welcomeEmailTemplate, welcomeEmailText } = require("./utils/email-templates")
    const config = require("./config/env")

    const to = req.body.to || "test@example.com"

    const html = welcomeEmailTemplate({
      fullName: "Test User",
      businessName: "Test Business",
      bookingLink: "/book/test-business",
      frontendUrl: config.clientUrl,
    })

    const text = welcomeEmailText({
      fullName: "Test User",
      businessName: "Test Business",
      bookingLink: "/book/test-business",
      frontendUrl: config.clientUrl,
    })

    const info = await sendMail({
      to,
      subject: "BookaFlow — SMTP Test Email",
      html,
      text,
    })

    res.json({
      success: true,
      message: "Email sent successfully",
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      code: err.code,
      command: err.command,
    })
  }
})

// Public routes (no auth)
app.use("/api/booking", bookingRoutes)
app.use("/api/public", publicRoutes)

// Auth routes
app.use("/api/auth", authRoutes)

// Protected routes (require auth)
app.use("/api/business", businessRoutes)
app.use("/api/services", serviceRoutes)
app.use("/api/staff", staffRoutes)
app.use("/api/appointments", appointmentRoutes)
app.use("/api/customers", customerRoutes)
app.use("/api/events", eventRoutes)

// Swagger docs
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec))

app.use(notFound)
app.use(errorHandler)

app.listen(config.port, () => {
  console.log(`\n  BookaFlow Booking API running on http://localhost:${config.port}`)
  console.log(`  Swagger docs: http://localhost:${config.port}/api/docs`)
  console.log(`  Environment: ${config.nodeEnv}\n`)
})
