const express = require("express")
const { prisma } = require("../config/prisma")
const { authMiddleware, businessMiddleware } = require("../middleware/auth")
const { validateBody } = require("../middleware/error")
const { serviceSchema } = require("../validations/auth")

const router = express.Router()

// All routes require auth + business access
router.use(authMiddleware)

// GET /api/services/:businessId
/**
 * @swagger
 * /api/services/{businessId}:
 *   get:
 *     tags: [Services]
 *     summary: List all services for a business
 *     security: [bearerAuth: []]
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of services
 *       401:
 *         description: Unauthorized
 */
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
/**
 * @swagger
 * /api/services/{businessId}:
 *   post:
 *     tags: [Services]
 *     summary: Create a new service
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
 *             required: [name, price, duration]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               duration:
 *                 type: integer
 *                 description: Duration in minutes
 *               staffIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Service created
 *       401:
 *         description: Unauthorized
 */
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
/**
 * @swagger
 * /api/services/{businessId}/{id}:
 *   put:
 *     tags: [Services]
 *     summary: Update a service
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
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               duration:
 *                 type: integer
 *               staffIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Service updated
 *       401:
 *         description: Unauthorized
 */
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
/**
 * @swagger
 * /api/services/{businessId}/{id}:
 *   delete:
 *     tags: [Services]
 *     summary: Delete a service
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
 *         description: Service deleted
 *       401:
 *         description: Unauthorized
 */
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
