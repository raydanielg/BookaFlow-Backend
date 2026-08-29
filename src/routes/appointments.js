const express = require("express")
const { prisma } = require("../config/prisma")
const { authMiddleware, businessMiddleware } = require("../middleware/auth")
const { validateBody } = require("../middleware/error")
const { appointmentSchema, updateAppointmentStatusSchema } = require("../validations/auth")
const { generateTimeSlots, getWeekDay } = require("../utils/helpers")

const router = express.Router()

router.use(authMiddleware)

// GET /api/appointments/:businessId?date=2026-08-30
router.get("/:businessId", businessMiddleware, async (req, res, next) => {
  try {
    const { date } = req.query
    const where = { businessId: req.businessId }

    if (date) {
      const start = new Date(date)
      start.setHours(0, 0, 0, 0)
      const end = new Date(date)
      end.setHours(23, 59, 59, 999)
      where.date = { gte: start, lte: end }
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        customer: true,
        service: true,
        staff: true,
      },
      orderBy: { startTime: "asc" },
    })

    res.json({
      appointments: appointments.map((a) => ({
        id: a.id,
        date: a.date,
        startTime: a.startTime,
        endTime: a.endTime,
        status: a.status,
        notes: a.notes,
        customer: {
          id: a.customer.id,
          name: a.customer.name,
          phone: a.customer.phone,
          email: a.customer.email,
        },
        service: {
          id: a.service.id,
          name: a.service.name,
          price: Number(a.service.price),
          duration: a.service.duration,
        },
        staff: {
          id: a.staff.id,
          name: a.staff.name,
        },
      })),
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/appointments/:businessId
router.post("/:businessId", businessMiddleware, validateBody(appointmentSchema), async (req, res, next) => {
  try {
    const { serviceId, staffId, date, startTime, customerName, customerPhone, customerEmail, notes } = req.body

    const service = await prisma.service.findFirst({
      where: { id: serviceId, businessId: req.businessId },
    })
    if (!service) {
      return res.status(404).json({ error: "Service not found" })
    }

    const endTime = calculateEndTime(startTime, service.duration)

    // Check for conflicts
    const conflict = await prisma.appointment.findFirst({
      where: {
        staffId,
        date: new Date(date),
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        OR: [
          {
            startTime: { lte: startTime },
            endTime: { gt: startTime },
          },
          {
            startTime: { lt: endTime },
            endTime: { gte: endTime },
          },
        ],
      },
    })

    if (conflict) {
      return res.status(409).json({ error: "Time slot already booked" })
    }

    // Find or create customer
    let customer = await prisma.customer.findFirst({
      where: { businessId: req.businessId, phone: customerPhone },
    })

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          businessId: req.businessId,
          name: customerName,
          phone: customerPhone,
          email: customerEmail,
        },
      })
    }

    const appointment = await prisma.appointment.create({
      data: {
        businessId: req.businessId,
        customerId: customer.id,
        serviceId,
        staffId,
        date: new Date(date),
        startTime,
        endTime,
        status: "PENDING",
        notes,
        phone: customerPhone,
      },
      include: {
        customer: true,
        service: true,
        staff: true,
      },
    })

    // Create notification record
    await prisma.notification.create({
      data: {
        businessId: req.businessId,
        type: "BOOKING_CREATED",
        channel: "SMS",
        recipient: customerPhone,
        message: `Appointment confirmed for ${service.name} on ${date} at ${startTime}.`,
      },
    })

    res.status(201).json({
      message: "Appointment created",
      appointment: {
        id: appointment.id,
        date: appointment.date,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointment.status,
        customer: {
          id: appointment.customer.id,
          name: appointment.customer.name,
          phone: appointment.customer.phone,
        },
        service: {
          id: appointment.service.id,
          name: appointment.service.name,
          price: Number(appointment.service.price),
        },
        staff: {
          id: appointment.staff.id,
          name: appointment.staff.name,
        },
      },
    })
  } catch (err) {
    next(err)
  }
})

// PUT /api/appointments/:businessId/:id/status
router.put("/:businessId/:id/status", businessMiddleware, validateBody(updateAppointmentStatusSchema), async (req, res, next) => {
  try {
    const { status } = req.body

    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status },
      include: { customer: true, service: true, staff: true },
    })

    res.json({
      message: "Appointment status updated",
      appointment: {
        id: appointment.id,
        status: appointment.status,
        customer: { name: appointment.customer.name, phone: appointment.customer.phone },
        service: { name: appointment.service.name },
        staff: { name: appointment.staff.name },
      },
    })
  } catch (err) {
    next(err)
  }
})

// PUT /api/appointments/:businessId/:id/reschedule
router.put("/:businessId/:id/reschedule", businessMiddleware, async (req, res, next) => {
  try {
    const { date, startTime } = req.body

    if (!date || !startTime) {
      return res.status(400).json({ error: "Date and startTime are required" })
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: { service: true },
    })

    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" })
    }

    const endTime = calculateEndTime(startTime, appointment.service.duration)

    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { date: new Date(date), startTime, endTime },
      include: { customer: true, service: true, staff: true },
    })

    res.json({
      message: "Appointment rescheduled",
      appointment: {
        id: updated.id,
        date: updated.date,
        startTime: updated.startTime,
        endTime: updated.endTime,
        status: updated.status,
      },
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/appointments/:businessId/available-slots?staffId=&date=&serviceId=
router.get("/:businessId/available-slots", businessMiddleware, async (req, res, next) => {
  try {
    const { staffId, date, serviceId } = req.query

    if (!staffId || !date || !serviceId) {
      return res.status(400).json({ error: "staffId, date, and serviceId are required" })
    }

    const service = await prisma.service.findFirst({
      where: { id: serviceId, businessId: req.businessId },
    })

    if (!service) {
      return res.status(404).json({ error: "Service not found" })
    }

    const dayName = getWeekDay(new Date(date))

    const workingHours = await prisma.workingHours.findFirst({
      where: { staffId, day: dayName, isOff: false },
    })

    if (!workingHours) {
      return res.json({ slots: [] })
    }

    const allSlots = generateTimeSlots(workingHours.startTime, workingHours.endTime, service.duration)

    // Get booked appointments for that day
    const dayStart = new Date(date)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(date)
    dayEnd.setHours(23, 59, 59, 999)

    const booked = await prisma.appointment.findMany({
      where: {
        staffId,
        date: { gte: dayStart, lte: dayEnd },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
      select: { startTime: true, endTime: true },
    })

    const bookedSlots = new Set(booked.map((b) => b.startTime))
    const availableSlots = allSlots.filter((slot) => !bookedSlots.has(slot))

    res.json({ slots: availableSlots })
  } catch (err) {
    next(err)
  }
})

function calculateEndTime(startTime, durationMinutes) {
  const [h, m] = startTime.split(":").map(Number)
  const total = h * 60 + m + durationMinutes
  const endH = Math.floor(total / 60)
  const endM = total % 60
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`
}

module.exports = router
