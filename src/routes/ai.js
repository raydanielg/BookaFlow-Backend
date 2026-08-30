const express = require("express")
const { prisma } = require("../config/prisma")
const { authMiddleware, businessMiddleware } = require("../middleware/auth")

const router = express.Router()

router.use(authMiddleware)

// GET /api/ai/:businessId/insights — AI-powered business insights (rule-based)
router.get("/:businessId/insights", businessMiddleware, async (req, res, next) => {
  try {
    const now = new Date()
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(now.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(now.getDate() - 29)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    const prevWeekStart = new Date(sevenDaysAgo)
    prevWeekStart.setDate(sevenDaysAgo.getDate() - 7)

    const [appointments30d, prevWeekAppts, customers, services] = await Promise.all([
      prisma.appointment.findMany({
        where: { businessId: req.businessId, date: { gte: thirtyDaysAgo } },
        include: { service: true, staff: true },
        orderBy: { date: "asc" },
      }),
      prisma.appointment.findMany({
        where: { businessId: req.businessId, date: { gte: prevWeekStart, lt: sevenDaysAgo } },
        include: { service: true },
      }),
      prisma.customer.count({ where: { businessId: req.businessId } }),
      prisma.service.findMany({ where: { businessId: req.businessId } }),
    ])

    const insights = []

    // Revenue trend insight
    const thisWeekRevenue = appointments30d
      .filter((a) => a.date >= sevenDaysAgo && a.status === "COMPLETED")
      .reduce((sum, a) => sum + Number(a.service.price), 0)
    const prevWeekRevenue = prevWeekAppts
      .filter((a) => a.status === "COMPLETED")
      .reduce((sum, a) => sum + Number(a.service.price), 0)

    if (prevWeekRevenue > 0) {
      const change = ((thisWeekRevenue - prevWeekRevenue) / prevWeekRevenue) * 100
      if (change > 0) {
        insights.push({
          type: "positive",
          icon: "trending-up",
          title: `Revenue increased by ${change.toFixed(1)}%`,
          detail: `You earned TZS ${thisWeekRevenue.toLocaleString()} this week compared to TZS ${prevWeekRevenue.toLocaleString()} last week.`,
        })
      } else if (change < 0) {
        insights.push({
          type: "warning",
          icon: "trending-down",
          title: `Revenue decreased by ${Math.abs(change).toFixed(1)}%`,
          detail: `You earned TZS ${thisWeekRevenue.toLocaleString()} this week compared to TZS ${prevWeekRevenue.toLocaleString()} last week. Consider promoting your services.`,
        })
      }
    } else if (thisWeekRevenue > 0) {
      insights.push({
        type: "positive",
        icon: "sparkles",
        title: "First revenue recorded!",
        detail: `You've earned TZS ${thisWeekRevenue.toLocaleString()} this week. Great start!`,
      })
    }

    // Busiest day insight
    const dayCount = {}
    appointments30d.forEach((a) => {
      const day = new Date(a.date).toLocaleDateString("en", { weekday: "long" })
      dayCount[day] = (dayCount[day] || 0) + 1
    })
    const busiestDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0]
    if (busiestDay && busiestDay[1] > 2) {
      insights.push({
        type: "info",
        icon: "calendar",
        title: `${busiestDay[0]} is your busiest day`,
        detail: `You had ${busiestDay[1]} appointments on ${busiestDay[0]}s in the last 30 days. Consider adding more staff on this day.`,
      })
    }

    // Top service insight
    const serviceMap = {}
    appointments30d.forEach((a) => {
      const name = a.service.name
      if (!serviceMap[name]) serviceMap[name] = { bookings: 0, revenue: 0 }
      serviceMap[name].bookings++
      if (a.status === "COMPLETED") serviceMap[name].revenue += Number(a.service.price)
    })
    const topService = Object.entries(serviceMap).sort((a, b) => b[1].revenue - a[1].revenue)[0]
    if (topService && topService[1].revenue > 0) {
      const totalRevenue = Object.values(serviceMap).reduce((s, v) => s + v.revenue, 0)
      const pct = ((topService[1].revenue / totalRevenue) * 100).toFixed(0)
      insights.push({
        type: "info",
        icon: "star",
        title: `${topService[0]} generates ${pct}% of your revenue`,
        detail: `TZS ${topService[1].revenue.toLocaleString()} from ${topService[1].bookings} bookings in the last 30 days.`,
      })
    }

    // Customer growth insight
    if (customers > 0) {
      const recentCustomers = await prisma.customer.count({
        where: { businessId: req.businessId, createdAt: { gte: sevenDaysAgo } },
      })
      if (recentCustomers > 0) {
        insights.push({
          type: "positive",
          icon: "users",
          title: `${recentCustomers} new customer${recentCustomers > 1 ? "s" : ""} this week`,
          detail: `You now have ${customers} total customers. Keep it up!`,
        })
      }
    }

    // No-show rate insight
    const noShows = appointments30d.filter((a) => a.status === "NO_SHOW").length
    if (noShows > 2) {
      const noShowRate = ((noShows / appointments30d.length) * 100).toFixed(1)
      insights.push({
        type: "warning",
        icon: "alert",
        title: `No-show rate is ${noShowRate}%`,
        detail: `${noShows} appointments were marked as no-shows. Consider requiring deposits or sending reminders.`,
      })
    }

    // No data insight
    if (insights.length === 0) {
      insights.push({
        type: "info",
        icon: "sparkles",
        title: "Welcome to BookaFlow AI Insights",
        detail: "Start booking appointments to get personalized insights about your business performance.",
      })
    }

    res.json({ insights })
  } catch (err) {
    next(err)
  }
})

// POST /api/ai/:businessId/chat — AI chat assistant (rule-based responses)
router.post("/:businessId/chat", businessMiddleware, async (req, res, next) => {
  try {
    const { message } = req.body

    if (!message) {
      return res.status(400).json({ error: "Message is required" })
    }

    const lowerMsg = message.toLowerCase()
    const now = new Date()
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(now.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    // Get current data for context
    const appointments = await prisma.appointment.findMany({
      where: { businessId: req.businessId, date: { gte: sevenDaysAgo } },
      include: { service: true, customer: true },
    })

    let response = ""
    let suggestions = []

    if (lowerMsg.includes("appointment") && (lowerMsg.includes("how many") || lowerMsg.includes("week"))) {
      const count = appointments.length
      const completed = appointments.filter((a) => a.status === "COMPLETED").length
      response = `You had ${count} appointments this week. ${completed} were completed.`
      suggestions = ["What about revenue?", "Which service is most popular?", "Show me insights"]
    } else if (lowerMsg.includes("revenue") || lowerMsg.includes("income") || lowerMsg.includes("money")) {
      const revenue = appointments
        .filter((a) => a.status === "COMPLETED")
        .reduce((sum, a) => sum + Number(a.service.price), 0)
      response = `Your revenue this week is TZS ${revenue.toLocaleString()} from ${appointments.filter((a) => a.status === "COMPLETED").length} completed appointments.`
      suggestions = ["How many appointments?", "Which service is most popular?", "Show me insights"]
    } else if (lowerMsg.includes("service") && (lowerMsg.includes("popular") || lowerMsg.includes("best") || lowerMsg.includes("top"))) {
      const serviceMap = {}
      appointments.forEach((a) => {
        serviceMap[a.service.name] = (serviceMap[a.service.name] || 0) + 1
      })
      const top = Object.entries(serviceMap).sort((a, b) => b[1] - a[1])[0]
      response = top ? `Your most popular service this week is "${top[0]}" with ${top[1]} bookings.` : "You don't have any bookings yet this week."
      suggestions = ["What about revenue?", "How many appointments?", "Show me insights"]
    } else if (lowerMsg.includes("customer") || lowerMsg.includes("clients")) {
      const totalCustomers = await prisma.customer.count({ where: { businessId: req.businessId } })
      const newCustomers = await prisma.customer.count({
        where: { businessId: req.businessId, createdAt: { gte: sevenDaysAgo } },
      })
      response = `You have ${totalCustomers} total customers. ${newCustomers} new customers joined this week.`
      suggestions = ["What about revenue?", "How many appointments?", "Show me insights"]
    } else if (lowerMsg.includes("insight") || lowerMsg.includes("summary") || lowerMsg.includes("how am i doing")) {
      const revenue = appointments.filter((a) => a.status === "COMPLETED").reduce((sum, a) => sum + Number(a.service.price), 0)
      response = `Here's your week: ${appointments.length} appointments, TZS ${revenue.toLocaleString()} in revenue, and ${appointments.filter((a) => a.status === "PENDING").length} pending appointments.`
      suggestions = ["Which service is most popular?", "Show me detailed insights", "How many customers?"]
    } else if (lowerMsg.includes("hello") || lowerMsg.includes("hi") || lowerMsg.includes("hey")) {
      response = "Hello! I'm your BookaFlow AI assistant. Ask me about your appointments, revenue, customers, or services."
      suggestions = ["How many appointments this week?", "What's my revenue?", "Show me insights"]
    } else {
      response = "I can help you with: appointments, revenue, customers, services, and business insights. Try asking 'How many appointments this week?' or 'What's my revenue?'"
      suggestions = ["How many appointments this week?", "What's my revenue?", "Show me insights"]
    }

    res.json({ response, suggestions })
  } catch (err) {
    next(err)
  }
})

module.exports = router
