const express = require("express")
const { prisma } = require("../config/prisma")
const { authMiddleware, businessMiddleware } = require("../middleware/auth")
const { validateBody } = require("../middleware/error")
const { staffSchema, workingHoursSchema } = require("../validations/auth")

const router = express.Router()

router.use(authMiddleware)

// GET /api/staff/:businessId
/**
 * @swagger
 * /api/staff/{businessId}:
 *   get:
 *     tags: [Staff]
 *     summary: List all staff members
 *     security: [bearerAuth: []]
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of staff members
 *       401:
 *         description: Unauthorized
 */
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
/**
 * @swagger
 * /api/staff/{businessId}:
 *   post:
 *     tags: [Staff]
 *     summary: Add a staff member
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
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               title:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               serviceIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Staff added
 *       401:
 *         description: Unauthorized
 */
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
/**
 * @swagger
 * /api/staff/{businessId}/{id}:
 *   put:
 *     tags: [Staff]
 *     summary: Update a staff member
 *     security: [bearerAuth: []]
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
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
 *               title:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               serviceIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Staff updated
 *       401:
 *         description: Unauthorized
 */
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
/**
 * @swagger
 * /api/staff/{businessId}/{id}:
 *   delete:
 *     tags: [Staff]
 *     summary: Remove a staff member
 *     security: [bearerAuth: []]
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Staff removed
 *       401:
 *         description: Unauthorized
 */
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
