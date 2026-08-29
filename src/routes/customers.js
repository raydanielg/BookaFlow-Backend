const express = require("express")
const { prisma } = require("../config/prisma")
const { authMiddleware, businessMiddleware } = require("../middleware/auth")
const { validateBody } = require("../middleware/error")
const { customerSchema } = require("../validations/auth")

const router = express.Router()

router.use(authMiddleware)

// GET /api/customers/:businessId?search=
router.get("/:businessId", businessMiddleware, async (req, res, next) => {
  try {
    const { search } = req.query
    const where = { businessId: req.businessId }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
      ]
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        _count: { select: { appointments: true } },
        appointments: {
          orderBy: { date: "desc" },
          take: 1,
          select: { date: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    res.json({
      customers: customers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        notes: c.notes,
        visits: c._count.appointments,
        lastAppointment: c.appointments[0]?.date || null,
      })),
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/customers/:businessId/:id
router.get("/:businessId/:id", businessMiddleware, async (req, res, next) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.id, businessId: req.businessId },
      include: {
        appointments: {
          include: { service: true, staff: true },
          orderBy: { date: "desc" },
        },
        _count: { select: { appointments: true } },
      },
    })

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" })
    }

    const completed = customer.appointments.filter((a) => a.status === "COMPLETED").length
    const cancelled = customer.appointments.filter((a) => a.status === "CANCELLED").length

    res.json({
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        notes: customer.notes,
        totalAppointments: customer._count.appointments,
        completed,
        cancelled,
        lastAppointment: customer.appointments[0]?.date || null,
        history: customer.appointments.map((a) => ({
          id: a.id,
          date: a.date,
          startTime: a.startTime,
          status: a.status,
          service: { name: a.service.name },
          staff: { name: a.staff.name },
        })),
      },
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/customers/:businessId
router.post("/:businessId", businessMiddleware, validateBody(customerSchema), async (req, res, next) => {
  try {
    const { name, phone, email, notes } = req.body

    const existing = await prisma.customer.findFirst({
      where: { businessId: req.businessId, phone },
    })

    if (existing) {
      return res.status(409).json({ error: "Customer with this phone already exists" })
    }

    const customer = await prisma.customer.create({
      data: { businessId: req.businessId, name, phone, email, notes },
    })

    res.status(201).json({
      message: "Customer added",
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
      },
    })
  } catch (err) {
    next(err)
  }
})

// PUT /api/customers/:businessId/:id
router.put("/:businessId/:id", businessMiddleware, validateBody(customerSchema), async (req, res, next) => {
  try {
    const { name, phone, email, notes } = req.body

    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: { name, phone, email, notes },
    })

    res.json({
      message: "Customer updated",
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
      },
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
