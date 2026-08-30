const express = require("express")
const { prisma } = require("../config/prisma")
const { authMiddleware, businessMiddleware } = require("../middleware/auth")

const router = express.Router()

router.use(authMiddleware)

// GET /api/payments/:businessId/transactions — list payment transactions
router.get("/:businessId/transactions", businessMiddleware, async (req, res, next) => {
  try {
    const { status, from, to } = req.query
    const where = { businessId: req.businessId }

    if (status) where.status = status
    if (from && to) {
      where.createdAt = {
        gte: new Date(from),
        lte: new Date(to),
      }
    }

    const transactions = await prisma.paymentTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    })

    const totalReceived = transactions
      .filter((t) => t.status === "COMPLETED")
      .reduce((sum, t) => sum + Number(t.amount), 0)
    const totalPending = transactions
      .filter((t) => t.status === "PENDING")
      .reduce((sum, t) => sum + Number(t.amount), 0)
    const totalRefunded = transactions
      .filter((t) => t.status === "REFUNDED")
      .reduce((sum, t) => sum + Number(t.amount), 0)

    res.json({
      summary: {
        totalReceived,
        totalPending,
        totalRefunded,
        count: transactions.length,
      },
      transactions: transactions.map((t) => ({
        id: t.id,
        customerName: t.customerName,
        customerPhone: t.customerPhone,
        customerEmail: t.customerEmail,
        amount: Number(t.amount),
        currency: t.currency,
        method: t.method,
        status: t.status,
        reference: t.reference,
        serviceName: t.serviceName,
        description: t.description,
        createdAt: t.createdAt,
      })),
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/payments/:businessId/transactions — record a payment
router.post("/:businessId/transactions", businessMiddleware, async (req, res, next) => {
  try {
    const { customerName, customerPhone, customerEmail, amount, method, status, reference, serviceName, description } = req.body

    if (!customerName || !amount) {
      return res.status(400).json({ error: "customerName and amount are required" })
    }

    const transaction = await prisma.paymentTransaction.create({
      data: {
        businessId: req.businessId,
        customerName,
        customerPhone,
        customerEmail,
        amount,
        method: method || "CASH",
        status: status || "COMPLETED",
        reference,
        serviceName,
        description,
      },
    })

    res.status(201).json({
      message: "Payment recorded",
      transaction: {
        id: transaction.id,
        customerName: transaction.customerName,
        amount: Number(transaction.amount),
        method: transaction.method,
        status: transaction.status,
      },
    })
  } catch (err) {
    next(err)
  }
})

// PUT /api/payments/:businessId/transactions/:id/status — update transaction status
router.put("/:businessId/transactions/:id/status", businessMiddleware, async (req, res, next) => {
  try {
    const { status } = req.body
    const validStatuses = ["PENDING", "COMPLETED", "FAILED", "REFUNDED", "CANCELLED"]

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" })
    }

    const transaction = await prisma.paymentTransaction.update({
      where: { id: req.params.id },
      data: { status },
    })

    res.json({
      message: "Transaction status updated",
      transaction: {
        id: transaction.id,
        status: transaction.status,
        amount: Number(transaction.amount),
      },
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/payments/plans — list subscription plans
router.get("/plans", async (req, res, next) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
    })

    res.json({
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        interval: p.interval,
        features: p.features,
      })),
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/payments/:businessId/subscription — get current subscription
router.get("/:businessId/subscription", businessMiddleware, async (req, res, next) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { businessId: req.businessId, status: "active" },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    })

    if (!subscription) {
      return res.json({ subscription: null, plan: null })
    }

    res.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
      },
      plan: subscription.plan ? {
        id: subscription.plan.id,
        name: subscription.plan.name,
        price: Number(subscription.plan.price),
        interval: subscription.plan.interval,
        features: subscription.plan.features,
      } : null,
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
