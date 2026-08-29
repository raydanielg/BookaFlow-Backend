const express = require("express")
const { prisma } = require("../config/prisma")
const { authMiddleware, businessMiddleware } = require("../middleware/auth")
const { validateBody } = require("../middleware/error")
const { serviceSchema } = require("../validations/auth")

const router = express.Router()

// All routes require auth + business access
router.use(authMiddleware)

// GET /api/services/:businessId
router.get("/:businessId", businessMiddleware, async (req, res, next) => {
  try {
    const services = await prisma.service.findMany({
      where: { businessId: req.businessId },
      include: {
        staff: { include: { staff: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    res.json({
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        price: Number(s.price),
        duration: s.duration,
        isActive: s.isActive,
        staff: s.staff.map((ss) => ({
          id: ss.staff.id,
          name: ss.staff.name,
          title: ss.staff.title,
        })),
      })),
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/services/:businessId
router.post("/:businessId", businessMiddleware, validateBody(serviceSchema), async (req, res, next) => {
  try {
    const { name, description, price, duration, staffIds } = req.body

    const service = await prisma.service.create({
      data: {
        businessId: req.businessId,
        name,
        description,
        price,
        duration,
        staff: staffIds?.length
          ? { create: staffIds.map((staffId) => ({ staffId })) }
          : undefined,
      },
      include: { staff: { include: { staff: true } } },
    })

    res.status(201).json({
      message: "Service created",
      service: {
        id: service.id,
        name: service.name,
        price: Number(service.price),
        duration: service.duration,
        staff: service.staff.map((ss) => ({
          id: ss.staff.id,
          name: ss.staff.name,
        })),
      },
    })
  } catch (err) {
    next(err)
  }
})

// PUT /api/services/:businessId/:id
router.put("/:businessId/:id", businessMiddleware, validateBody(serviceSchema), async (req, res, next) => {
  try {
    const { name, description, price, duration, staffIds } = req.body

    await prisma.staffService.deleteMany({
      where: { serviceId: req.params.id },
    })

    const service = await prisma.service.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        price,
        duration,
        staff: staffIds?.length
          ? { create: staffIds.map((staffId) => ({ staffId })) }
          : undefined,
      },
      include: { staff: { include: { staff: true } } },
    })

    res.json({
      message: "Service updated",
      service: {
        id: service.id,
        name: service.name,
        price: Number(service.price),
        duration: service.duration,
        staff: service.staff.map((ss) => ({
          id: ss.staff.id,
          name: ss.staff.name,
        })),
      },
    })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/services/:businessId/:id
router.delete("/:businessId/:id", businessMiddleware, async (req, res, next) => {
  try {
    await prisma.service.delete({
      where: { id: req.params.id },
    })

    res.json({ message: "Service deleted" })
  } catch (err) {
    next(err)
  }
})

module.exports = router
