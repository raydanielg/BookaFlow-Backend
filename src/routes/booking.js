const express = require("express")
const { prisma } = require("../config/prisma")
const { validateBody } = require("../middleware/error")
const { appointmentSchema } = require("../validations/auth")
const { generateTimeSlots, getWeekDay } = require("../utils/helpers")

const router = express.Router()

// GET /api/booking/:slug — public business profile + services
/**
 * @swagger
 * /api/booking/{slug}:
 *   get:
 *     tags: [Booking]
 *     summary: Get public business profile + services
 *     description: Public endpoint — no auth required
 *     security: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         example: beauty-house
 *     responses:
 *       200:
 *         description: Business profile with services, staff, and working hours
 *       404:
 *         description: Business not found
 */
router.get("/:slug", async (req, res, next) => {
  try {
    const business = await prisma.business.findUnique({
      where: { slug: req.params.slug },
      include: {
        services: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            duration: true,
            staff: { select: { staff: { select: { id: true, name: true, title: true } } } },
          },
        },
        staff: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            title: true,
            services: { select: { serviceId: true } },
          },
        },
        workingHours: {
          where: { staffId: null },
          orderBy: { day: "asc" },
        },
      },
    })

    if (!business) {
      return res.status(404).json({ error: "Business not found" })
    }

    res.json({
      business: {
        name: business.name,
        description: business.description,
        logo: business.logo,
        phone: business.phone,
        address: business.address,
        city: business.city,
      },
      services: business.services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        price: Number(s.price),
        duration: s.duration,
        staff: s.staff.map((ss) => ({
          id: ss.staff.id,
          name: ss.staff.name,
          title: ss.staff.title,
        })),
      })),
      staff: business.staff.map((st) => ({
        id: st.id,
        name: st.name,
        title: st.title,
        serviceIds: st.services.map((ss) => ss.serviceId),
      })),
      workingHours: business.workingHours,
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/booking/:slug/slots?serviceId=&staffId=&date=
/**
 * @swagger
 * /api/booking/{slug}/slots:
 *   get:
 *     tags: [Booking]
 *     summary: Get available time slots for booking
 *     description: Public endpoint — no auth required
 *     security: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: staffId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Available time slots
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 slots:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Missing required query params
 *       404:
 *         description: Business or service not found
 */
router.get("/:slug/slots", async (req, res, next) => {
  try {
    const { serviceId, staffId, date } = req.query

    if (!serviceId || !staffId || !date) {
      return res.status(400).json({ error: "serviceId, staffId, and date are required" })
    }

    const business = await prisma.business.findUnique({
      where: { slug: req.params.slug },
      select: { id: true },
    })

    if (!business) {
      return res.status(404).json({ error: "Business not found" })
    }

    const service = await prisma.service.findFirst({
      where: { id: serviceId, businessId: business.id, isActive: true },
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
      select: { startTime: true },
    })

    const bookedSlots = new Set(booked.map((b) => b.startTime))
    const availableSlots = allSlots.filter((slot) => !bookedSlots.has(slot))

    res.json({ slots: availableSlots })
  } catch (err) {
    next(err)
  }
})

// POST /api/booking/:slug — create appointment (no auth required)
/**
 * @swagger
 * /api/booking/{slug}:
 *   post:
 *     tags: [Booking]
 *     summary: Create a booking (public, no auth)
 *     description: Public endpoint — customers can book without an account
 *     security: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         example: beauty-house
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [serviceId, staffId, date, startTime, customerName, customerPhone]
 *             properties:
 *               serviceId:
 *                 type: string
 *               staffId:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               startTime:
 *                 type: string
 *                 example: "09:00"
 *               customerName:
 *                 type: string
 *               customerPhone:
 *                 type: string
 *               customerEmail:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Booking confirmed
 *       404:
 *         description: Business or service not found
 *       409:
 *         description: Time slot already booked
 */
router.post("/:slug", validateBody(appointmentSchema), async (req, res, next) => {
  try {
    const { serviceId, staffId, date, startTime, customerName, customerPhone, customerEmail, notes } = req.body

    const business = await prisma.business.findUnique({
      where: { slug: req.params.slug },
      select: { id: true },
    })

    if (!business) {
      return res.status(404).json({ error: "Business not found" })
    }

    const service = await prisma.service.findFirst({
      where: { id: serviceId, businessId: business.id, isActive: true },
    })

    if (!service) {
      return res.status(404).json({ error: "Service not found" })
    }

    const endTime = calculateEndTime(startTime, service.duration)

    // Check conflicts
    const conflict = await prisma.appointment.findFirst({
      where: {
        staffId,
        date: new Date(date),
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        OR: [
          { startTime: { lte: startTime }, endTime: { gt: startTime } },
          { startTime: { lt: endTime }, endTime: { gte: endTime } },
        ],
      },
    })

    if (conflict) {
      return res.status(409).json({ error: "This time slot is already booked" })
    }

    // Find or create customer
    let customer = await prisma.customer.findFirst({
      where: { businessId: business.id, phone: customerPhone },
    })

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          businessId: business.id,
          name: customerName,
          phone: customerPhone,
          email: customerEmail,
        },
      })
    }

    const appointment = await prisma.appointment.create({
      data: {
        businessId: business.id,
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
      include: { service: true, staff: true },
    })

    // Create notification
    await prisma.notification.create({
      data: {
        businessId: business.id,
        type: "BOOKING_CREATED",
        channel: "SMS",
        recipient: customerPhone,
        message: `Your appointment for ${service.name} on ${date} at ${startTime} has been received.`,
      },
    })

    res.status(201).json({
      message: "Booking confirmed",
      appointment: {
        id: appointment.id,
        date: appointment.date,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointment.status,
        service: { name: appointment.service.name, price: Number(appointment.service.price) },
        staff: { name: appointment.staff.name },
      },
    })
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
