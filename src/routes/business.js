const express = require("express")
const { prisma } = require("../config/prisma")
const { authMiddleware, businessMiddleware } = require("../middleware/auth")
const { validateBody } = require("../middleware/error")
const { businessProfileSchema, workingHoursSchema, seoSchema, bookingSettingsSchema } = require("../validations/auth")

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
        profile: true,
        bookingSettings: true,
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
        shortDescription: business.shortDescription,
        logo: business.logo,
        coverImage: business.coverImage,
        phone: business.phone,
        email: business.email,
        website: business.website,
        address: business.address,
        city: business.city,
        region: business.region,
        country: business.country,
        googleMapsLink: business.googleMapsLink,
        instagram: business.instagram,
        facebook: business.facebook,
        tiktok: business.tiktok,
        whatsapp: business.whatsapp,
        profileVisibility: business.profileVisibility,
        bookingVisibility: business.bookingVisibility,
        bookingLink: business.bookingLink,
        stats: {
          services: business._count.services,
          staff: business._count.staff,
          customers: business._count.customers,
          appointments: business._count.appointments,
        },
        workingHours: business.workingHours,
        seo: business.profile,
        bookingSettings: business.bookingSettings,
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
    const business = await prisma.business.update({
      where: { id: req.businessId },
      data: req.body,
    })

    res.json({
      message: "Business profile updated",
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug,
      },
    })
  } catch (err) {
    next(err)
  }
})

// PUT /api/business/:businessId/seo
router.put("/:businessId/seo", businessMiddleware, validateBody(seoSchema), async (req, res, next) => {
  try {
    const existing = await prisma.businessProfile.findUnique({
      where: { businessId: req.businessId },
    })

    if (existing) {
      const updated = await prisma.businessProfile.update({
        where: { businessId: req.businessId },
        data: req.body,
      })
      res.json({ message: "SEO settings updated", seo: updated })
    } else {
      const created = await prisma.businessProfile.create({
        data: { businessId: req.businessId, ...req.body },
      })
      res.json({ message: "SEO settings created", seo: created })
    }
  } catch (err) {
    next(err)
  }
})

// PUT /api/business/:businessId/booking-settings
router.put("/:businessId/booking-settings", businessMiddleware, validateBody(bookingSettingsSchema), async (req, res, next) => {
  try {
    const existing = await prisma.bookingSettings.findUnique({
      where: { businessId: req.businessId },
    })

    if (existing) {
      const updated = await prisma.bookingSettings.update({
        where: { businessId: req.businessId },
        data: req.body,
      })
      res.json({ message: "Booking settings updated", settings: updated })
    } else {
      const created = await prisma.bookingSettings.create({
        data: { businessId: req.businessId, ...req.body },
      })
      res.json({ message: "Booking settings created", settings: created })
    }
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

    const [todayAppointments, totalCustomers] = await Promise.all([
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
    ])

    const revenueToday = todayAppointments
      .filter((a) => a.status === "COMPLETED")
      .reduce((sum, a) => sum + Number(a.service.price), 0)

    res.json({
      overview: {
        appointmentsToday: todayAppointments.length,
        totalCustomers,
        revenueToday,
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

/**
 * @swagger
 * /api/business/{businessId}/analytics:
 *   get:
 *     summary: Get analytics data (revenue trend, status breakdown, top services, KPIs)
 *     tags: [Business]
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Analytics data
 */
router.get("/:businessId/analytics", businessMiddleware, async (req, res, next) => {
  try {
    const now = new Date()
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(now.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(now.getDate() - 29)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    const prevSevenDaysAgo = new Date(sevenDaysAgo)
    prevSevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Fetch all appointments in last 30 days with relations
    const appointments = await prisma.appointment.findMany({
      where: {
        businessId: req.businessId,
        date: { gte: thirtyDaysAgo },
      },
      include: {
        service: true,
        customer: true,
      },
      orderBy: { date: "asc" },
    })

    // Fetch previous 7 days for comparison
    const prevWeekAppointments = await prisma.appointment.findMany({
      where: {
        businessId: req.businessId,
        date: { gte: prevSevenDaysAgo, lt: sevenDaysAgo },
      },
      include: { service: true },
    })

    const totalCustomers = await prisma.customer.count({ where: { businessId: req.businessId } })
    const prevWeekCustomers = await prisma.customer.count({
      where: {
        businessId: req.businessId,
        createdAt: { gte: prevSevenDaysAgo, lt: sevenDaysAgo },
      },
    })
    const thisWeekCustomers = await prisma.customer.count({
      where: {
        businessId: req.businessId,
        createdAt: { gte: sevenDaysAgo },
      },
    })

    // Build 7-day revenue trend
    const revenueTrend = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(sevenDaysAgo)
      day.setDate(sevenDaysAgo.getDate() + i)
      const dayEnd = new Date(day)
      dayEnd.setHours(23, 59, 59, 999)

      const dayAppts = appointments.filter(
        (a) => a.date >= day && a.date <= dayEnd
      )
      const dayRevenue = dayAppts
        .filter((a) => a.status === "COMPLETED")
        .reduce((sum, a) => sum + Number(a.service.price), 0)

      revenueTrend.push({
        date: day.toISOString().split("T")[0],
        label: day.toLocaleDateString("en", { weekday: "short" }),
        revenue: dayRevenue,
        appointments: dayAppts.length,
      })
    }

    // Appointment status breakdown (last 30 days)
    const statusCounts = { COMPLETED: 0, CONFIRMED: 0, PENDING: 0, CANCELLED: 0, NO_SHOW: 0 }
    appointments.forEach((a) => {
      if (statusCounts[a.status] !== undefined) statusCounts[a.status]++
    })
    const statusBreakdown = Object.entries(statusCounts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }))

    // Top services by bookings (last 30 days)
    const serviceMap = {}
    appointments.forEach((a) => {
      const name = a.service.name
      if (!serviceMap[name]) {
        serviceMap[name] = { name, bookings: 0, revenue: 0 }
      }
      serviceMap[name].bookings++
      if (a.status === "COMPLETED") {
        serviceMap[name].revenue += Number(a.service.price)
      }
    })
    const topServices = Object.values(serviceMap)
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 5)

    // KPIs
    const thisWeekRevenue = revenueTrend.reduce((sum, d) => sum + d.revenue, 0)
    const thisWeekAppts = revenueTrend.reduce((sum, d) => sum + d.appointments, 0)
    const prevWeekRevenue = prevWeekAppointments
      .filter((a) => a.status === "COMPLETED")
      .reduce((sum, a) => sum + Number(a.service.price), 0)
    const prevWeekApptsCount = prevWeekAppointments.length

    const revenueDelta = prevWeekRevenue > 0
      ? ((thisWeekRevenue - prevWeekRevenue) / prevWeekRevenue) * 100
      : thisWeekRevenue > 0 ? 100 : 0
    const apptsDelta = prevWeekApptsCount > 0
      ? ((thisWeekAppts - prevWeekApptsCount) / prevWeekApptsCount) * 100
      : thisWeekAppts > 0 ? 100 : 0
    const customersDelta = prevWeekCustomers > 0
      ? ((thisWeekCustomers - prevWeekCustomers) / prevWeekCustomers) * 100
      : thisWeekCustomers > 0 ? 100 : 0
    const avgOrderValue = thisWeekAppts > 0 ? thisWeekRevenue / thisWeekAppts : 0
    const prevAvgOrder = prevWeekApptsCount > 0 ? prevWeekRevenue / prevWeekApptsCount : 0
    const avgOrderDelta = prevAvgOrder > 0
      ? ((avgOrderValue - prevAvgOrder) / prevAvgOrder) * 100
      : avgOrderValue > 0 ? 100 : 0

    res.json({
      kpis: {
        revenue: { value: thisWeekRevenue, delta: revenueDelta },
        appointments: { value: thisWeekAppts, delta: apptsDelta },
        customers: { value: totalCustomers, delta: customersDelta },
        avgOrderValue: { value: avgOrderValue, delta: avgOrderDelta },
      },
      revenueTrend,
      statusBreakdown,
      topServices,
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
