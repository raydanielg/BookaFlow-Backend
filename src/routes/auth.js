const express = require("express")
const { prisma } = require("../config/prisma")
const { hashPassword, comparePassword } = require("../utils/hash")
const { generateToken } = require("../utils/jwt")
const { slugify } = require("../utils/helpers")
const { validateBody } = require("../middleware/error")
const { authMiddleware } = require("../middleware/auth")
const { signupSchema, loginSchema } = require("../validations/auth")

const router = express.Router()

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new business owner
 *     description: Creates a user, business, and business member in one transaction
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, email, password, businessName]
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: Jane Doe
 *               email:
 *                 type: string
 *                 example: jane@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *               businessName:
 *                 type: string
 *                 example: Beauty House
 *               businessType:
 *                 type: string
 *                 enum: [SALON, CLINIC, SPA, GYM, CONSULTATION, OTHER]
 *                 example: SALON
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                 business:
 *                   type: object
 *       409:
 *         description: Email already registered
 */
router.post("/signup", validateBody(signupSchema), async (req, res, next) => {
  try {
    const { fullName, email, password, businessName, businessType } = req.body

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return res.status(409).json({ error: "Email already registered" })
    }

    const hashed = await hashPassword(password)

    let slug = slugify(businessName)
    let slugExists = await prisma.business.findUnique({ where: { slug } })
    let counter = 1
    while (slugExists) {
      slug = `${slugify(businessName)}-${counter}`
      slugExists = await prisma.business.findUnique({ where: { slug } })
      counter++
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          fullName,
          password: hashed,
          role: "BUSINESS_OWNER",
        },
      })

      const business = await tx.business.create({
        data: {
          name: businessName,
          slug,
          type: businessType || "OTHER",
          bookingLink: `/book/${slug}`,
        },
      })

      await tx.businessMember.create({
        data: {
          userId: user.id,
          businessId: business.id,
          role: "BUSINESS_OWNER",
        },
      })

      return { user, business }
    })

    const token = generateToken({ id: result.user.id, email: result.user.email, role: result.user.role })

    res.status(201).json({
      message: "Account created successfully",
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
        role: result.user.role,
      },
      business: {
        id: result.business.id,
        name: result.business.name,
        slug: result.business.slug,
        bookingLink: result.business.bookingLink,
      },
    })
  } catch (err) {
    next(err)
  }
})

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: owner@beauty-house.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                 businesses:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Invalid email or password
 */
router.post("/login", validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: { business: true },
        },
      },
    })

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" })
    }

    const valid = await comparePassword(password, user.password)
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" })
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role })

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      businesses: user.memberships.map((m) => ({
        id: m.business.id,
        name: m.business.name,
        slug: m.business.slug,
        role: m.role,
        bookingLink: m.business.bookingLink,
      })),
    })
  } catch (err) {
    next(err)
  }
})

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user profile
 *     security: [bearerAuth: []]
 *     responses:
 *       200:
 *         description: Current user info with businesses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                 businesses:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 */
router.get("/me", authMiddleware, async (req, res, next) => {
  try {
    const businesses = await prisma.businessMember.findMany({
      where: { userId: req.user.id },
      include: { business: true },
    })

    res.json({
      user: req.user,
      businesses: businesses.map((m) => ({
        id: m.business.id,
        name: m.business.name,
        slug: m.business.slug,
        role: m.role,
        bookingLink: m.business.bookingLink,
      })),
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
