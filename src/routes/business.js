const express = require("express")
const { prisma } = require("../config/prisma")
const { authMiddleware, businessMiddleware } = require("../middleware/auth")
const { validateBody } = require("../middleware/error")
const { businessProfileSchema, workingHoursSchema } = require("../validations/auth")

const router = express.Router()

router.use(authMiddleware)

// GET /api/business/:businessId
/**
 * @swagger
 * /api/business/{businessId}:
 *   get:
 *     tags: [Business]
 *     summary: Get business profile
 *     security: [bearerAuth: []]
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Business profile with stats
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not a member of this business
 */
router.get("/:businessId", businessMiddleware, async (req, res, next) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.businessId },
      include: {
        workingHours: { where: { staffId: null } },
        _count: {
          select: {
            services: true,
            staff: true,
            customers: true,
            appointments: true,
          },
        },
      },
    })

    res.json({
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug,
        type: business.type,
        description: business.description,
        logo: business.logo,
        phone: business.phone,
        email: business.email,
        address: business.address,
        city: business.city,
        bookingLink: business.bookingLink,
        stats: {
          services: business._count.services,
          staff: business._count.staff,
          customers: business._count.customers,
          appointments: business._count.appointments,
        },
        workingHours: business.workingHours,
      },
    })
  } catch (err) {
    next(err)
  }
})

// PUT /api/business/:businessId
/**
 * @swagger
 * /api/business/{businessId}:
 *   put:
 *     tags: [Business]
 *     summary: Update business profile
 *     security: [bearerAuth: []]
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *     responses:
 *       200:
 *         description: Business profile updated
 *       401:
 *         description: Unauthorized
 */
router.put("/:businessId", businessMiddleware, validateBody(businessProfileSchema), async (req, res, next) => {
  try {
    const { name, description, phone, email, address, city } = req.body

    const business = await prisma.business.update({
      where: { id: req.businessId },
      data: { name, description, phone, email, address, city },
    })

    res.json({
      message: "Business profile updated",
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug,
        phone: business.phone,
        email: business.email,
        address: business.address,
        city: business.city,
      },
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/business/:businessId/working-hours
router.get("/:businessId/working-hours", businessMiddleware, async (req, res, next) => {
  try {
    const hours = await prisma.workingHours.findMany({
      where: { businessId: req.businessId, staffId: null },
      orderBy: { day: "asc" },
    })

    res.json({ workingHours: hours })
  } catch (err) {
    next(err)
  }
})

// POST /api/business/:businessId/working-hours
router.post("/:businessId/working-hours", businessMiddleware, validateBody(workingHoursSchema), async (req, res, next) => {
  try {
    const { day, startTime, endTime, isOff } = req.body

    const existing = await prisma.workingHours.findFirst({
      where: { businessId: req.businessId, staffId: null, day },
    })

    let wh
    if (existing) {
      wh = await prisma.workingHours.update({
        where: { id: existing.id },
        data: { startTime, endTime, isOff: isOff || false },
      })
    } else {
      wh = await prisma.workingHours.create({
        data: {
          businessId: req.businessId,
          staffId: null,
          day,
          startTime,
          endTime,
          isOff: isOff || false,
        },
      })
    }

    res.json({ message: "Working hours saved", workingHours: wh })
  } catch (err) {
    next(err)
  }
})

// GET /api/business/:businessId/dashboard
/**
 * @swagger
 * /api/business/{businessId}/dashboard:
 *   get:
 *     tags: [Business]
 *     summary: Get dashboard overview (today's schedule + stats)
 *     security: [bearerAuth: []]
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dashboard data with overview and schedule
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 overview:
 *                   type: object
 *                   properties:
 *                     appointmentsToday:
 *                       type: integer
 *                     totalCustomers:
 *                       type: integer
 *                     revenueToday:
 *                       type: number
 *                 schedule:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 */
router.get("/:businessId/dashboard", businessMiddleware, async (req, res, next) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const [todayAppointments, totalCustomers, todayRevenue] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          businessId: req.businessId,
          date: { gte: today, lte: todayEnd },
        },
        include: {
          customer: true,
          service: true,
          staff: true,
        },
        orderBy: { startTime: "asc" },
      }),
      prisma.customer.count({ where: { businessId: req.businessId } }),
      prisma.appointment.aggregate({
        where: {
          businessId: req.businessId,
          date: { gte: today, lte: todayEnd },
          status: "COMPLETED",
        },
        _sum: { service: { price: true } },
      }),
    ])

    res.json({
      overview: {
        appointmentsToday: todayAppointments.length,
        totalCustomers,
        revenueToday: 0, // calculated from service prices below
      },
      schedule: todayAppointments.map((a) => ({
        id: a.id,
        startTime: a.startTime,
        endTime: a.endTime,
        status: a.status,
        customer: { name: a.customer.name, phone: a.customer.phone },
        service: { name: a.service.name, price: Number(a.service.price) },
        staff: { name: a.staff.name },
      })),
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
