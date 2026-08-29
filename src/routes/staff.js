const express = require("express")
const { prisma } = require("../config/prisma")
const { authMiddleware, businessMiddleware } = require("../middleware/auth")
const { validateBody } = require("../middleware/error")
const { staffSchema, workingHoursSchema } = require("../validations/auth")

const router = express.Router()

router.use(authMiddleware)

// GET /api/staff/:businessId
router.get("/:businessId", businessMiddleware, async (req, res, next) => {
  try {
    const staff = await prisma.staff.findMany({
      where: { businessId: req.businessId },
      include: {
        services: { include: { service: true } },
        workingHours: true,
        _count: { select: { appointments: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    res.json({
      staff: staff.map((s) => ({
        id: s.id,
        name: s.name,
        title: s.title,
        phone: s.phone,
        email: s.email,
        isActive: s.isActive,
        appointmentsCount: s._count.appointments,
        services: s.services.map((ss) => ({
          id: ss.service.id,
          name: ss.service.name,
        })),
        workingHours: s.workingHours,
      })),
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/staff/:businessId
router.post("/:businessId", businessMiddleware, validateBody(staffSchema), async (req, res, next) => {
  try {
    const { name, title, phone, email, serviceIds } = req.body

    const staff = await prisma.staff.create({
      data: {
        businessId: req.businessId,
        name,
        title,
        phone,
        email,
        services: serviceIds?.length
          ? { create: serviceIds.map((serviceId) => ({ serviceId })) }
          : undefined,
      },
      include: {
        services: { include: { service: true } },
      },
    })

    res.status(201).json({
      message: "Staff added",
      staff: {
        id: staff.id,
        name: staff.name,
        title: staff.title,
        phone: staff.phone,
        services: staff.services.map((ss) => ({
          id: ss.service.id,
          name: ss.service.name,
        })),
      },
    })
  } catch (err) {
    next(err)
  }
})

// PUT /api/staff/:businessId/:id
router.put("/:businessId/:id", businessMiddleware, validateBody(staffSchema), async (req, res, next) => {
  try {
    const { name, title, phone, email, serviceIds } = req.body

    await prisma.staffService.deleteMany({
      where: { staffId: req.params.id },
    })

    const staff = await prisma.staff.update({
      where: { id: req.params.id },
      data: {
        name,
        title,
        phone,
        email,
        services: serviceIds?.length
          ? { create: serviceIds.map((serviceId) => ({ serviceId })) }
          : undefined,
      },
      include: { services: { include: { service: true } } },
    })

    res.json({
      message: "Staff updated",
      staff: {
        id: staff.id,
        name: staff.name,
        title: staff.title,
        services: staff.services.map((ss) => ({
          id: ss.service.id,
          name: ss.service.name,
        })),
      },
    })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/staff/:businessId/:id
router.delete("/:businessId/:id", businessMiddleware, async (req, res, next) => {
  try {
    await prisma.staff.delete({
      where: { id: req.params.id },
    })

    res.json({ message: "Staff removed" })
  } catch (err) {
    next(err)
  }
})

// POST /api/staff/:businessId/:id/working-hours
router.post("/:businessId/:id/working-hours", businessMiddleware, validateBody(workingHoursSchema), async (req, res, next) => {
  try {
    const { day, startTime, endTime, isOff } = req.body

    const existing = await prisma.workingHours.findFirst({
      where: { staffId: req.params.id, day },
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
          staffId: req.params.id,
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

module.exports = router
