const express = require("express")
const { prisma } = require("../config/prisma")
const { hashPassword, comparePassword } = require("../utils/hash")
const { generateToken } = require("../utils/jwt")
const { slugify } = require("../utils/helpers")
const { validateBody } = require("../middleware/error")
const { authMiddleware } = require("../middleware/auth")
const { signupSchema, loginSchema } = require("../validations/auth")

const router = express.Router()

// POST /api/auth/signup — creates user + business + member
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

// POST /api/auth/login
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

// GET /api/auth/me
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
