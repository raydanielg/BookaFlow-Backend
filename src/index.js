const express = require("express")
const helmet = require("helmet")
const cors = require("cors")
const morgan = require("morgan")
const cookieParser = require("cookie-parser")

const config = require("./config/env")
const { notFound, errorHandler } = require("./middleware/error")
const authRoutes = require("./routes/auth")
const businessRoutes = require("./routes/business")
const serviceRoutes = require("./routes/services")
const staffRoutes = require("./routes/staff")
const appointmentRoutes = require("./routes/appointments")
const customerRoutes = require("./routes/customers")
const bookingRoutes = require("./routes/booking")

const app = express()

app.use(helmet())
app.use(
  cors({
    origin: config.clientUrl,
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

// Public booking route (no auth)
app.use("/api/booking", bookingRoutes)

// Auth routes
app.use("/api/auth", authRoutes)

// Protected routes (require auth)
app.use("/api/business", businessRoutes)
app.use("/api/services", serviceRoutes)
app.use("/api/staff", staffRoutes)
app.use("/api/appointments", appointmentRoutes)
app.use("/api/customers", customerRoutes)

app.use(notFound)
app.use(errorHandler)

app.listen(config.port, () => {
  console.log(`\n  BookaFlow Booking API running on http://localhost:${config.port}`)
  console.log(`  Environment: ${config.nodeEnv}\n`)
})
