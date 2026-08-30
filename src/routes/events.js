const express = require("express")
const { prisma } = require("../config/prisma")
const { authMiddleware, businessMiddleware } = require("../middleware/auth")
const { validateBody } = require("../middleware/error")

const router = express.Router()

router.use(authMiddleware)

// Helper to generate slug
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80)
}

// GET /api/events/:businessId — list all events for a business
router.get("/:businessId", businessMiddleware, async (req, res, next) => {
  try {
    const events = await prisma.event.findMany({
      where: { businessId: req.businessId },
      include: {
        tickets: true,
        _count: { select: { registrations: true } },
      },
      orderBy: { startDate: "desc" },
    })

    res.json({
      events: events.map((e) => ({
        id: e.id,
        title: e.title,
        slug: e.slug,
        description: e.description,
        coverImage: e.coverImage,
        category: e.category,
        mode: e.mode,
        registrationType: e.registrationType,
        startDate: e.startDate,
        endDate: e.endDate,
        location: e.location,
        onlineLink: e.onlineLink,
        capacity: e.capacity,
        isPublished: e.isPublished,
        isRegistrationOpen: e.isRegistrationOpen,
        registrationsCount: e._count.registrations,
        tickets: e.tickets.map((t) => ({
          id: t.id,
          name: t.name,
          price: Number(t.price),
          quantity: t.quantity,
          soldCount: t.soldCount,
        })),
      })),
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/events/:businessId/:eventId — get single event with registrations
router.get("/:businessId/:eventId", businessMiddleware, async (req, res, next) => {
  try {
    const event = await prisma.event.findFirst({
      where: { id: req.params.eventId, businessId: req.businessId },
      include: {
        tickets: true,
        registrations: { orderBy: { createdAt: "desc" } },
      },
    })

    if (!event) {
      return res.status(404).json({ error: "Event not found" })
    }

    res.json({
      event: {
        id: event.id,
        title: event.title,
        slug: event.slug,
        description: event.description,
        coverImage: event.coverImage,
        category: event.category,
        mode: event.mode,
        registrationType: event.registrationType,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        onlineLink: event.onlineLink,
        capacity: event.capacity,
        isPublished: event.isPublished,
        isRegistrationOpen: event.isRegistrationOpen,
        tickets: event.tickets.map((t) => ({
          id: t.id,
          name: t.name,
          price: Number(t.price),
          quantity: t.quantity,
          soldCount: t.soldCount,
          description: t.description,
        })),
        registrations: event.registrations.map((r) => ({
          id: r.id,
          fullName: r.fullName,
          email: r.email,
          phone: r.phone,
          organization: r.organization,
          occupation: r.occupation,
          motivation: r.motivation,
          status: r.status,
          ticketNumber: r.ticketNumber,
          checkedIn: r.checkedIn,
          createdAt: r.createdAt,
        })),
      },
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/events/:businessId — create event
router.post("/:businessId", businessMiddleware, async (req, res, next) => {
  try {
    const {
      title, description, coverImage, category, mode, registrationType,
      startDate, endDate, location, onlineLink, capacity, tickets,
    } = req.body

    if (!title || !startDate || !endDate) {
      return res.status(400).json({ error: "title, startDate, and endDate are required" })
    }

    let slug = generateSlug(title)
    // Ensure unique slug
    const existing = await prisma.event.findFirst({
      where: { businessId: req.businessId, slug },
    })
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`
    }

    const event = await prisma.event.create({
      data: {
        businessId: req.businessId,
        title,
        slug,
        description,
        coverImage,
        category: category || "OTHER",
        mode: mode || "PHYSICAL",
        registrationType: registrationType || "FREE",
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location,
        onlineLink,
        capacity: capacity || 0,
        tickets: tickets && tickets.length > 0 ? {
          create: tickets.map((t) => ({
            name: t.name,
            price: t.price || 0,
            quantity: t.quantity || 0,
            description: t.description,
          })),
        } : undefined,
      },
      include: { tickets: true },
    })

    res.status(201).json({
      message: "Event created",
      event: {
        id: event.id,
        title: event.title,
        slug: event.slug,
        category: event.category,
        mode: event.mode,
        registrationType: event.registrationType,
        startDate: event.startDate,
        endDate: event.endDate,
        tickets: event.tickets.map((t) => ({
          id: t.id,
          name: t.name,
          price: Number(t.price),
          quantity: t.quantity,
        })),
      },
    })
  } catch (err) {
    next(err)
  }
})

// PUT /api/events/:businessId/:eventId — update event
router.put("/:businessId/:eventId", businessMiddleware, async (req, res, next) => {
  try {
    const {
      title, description, coverImage, category, mode, registrationType,
      startDate, endDate, location, onlineLink, capacity,
      isPublished, isRegistrationOpen,
    } = req.body

    const event = await prisma.event.findFirst({
      where: { id: req.params.eventId, businessId: req.businessId },
    })

    if (!event) {
      return res.status(404).json({ error: "Event not found" })
    }

    const updated = await prisma.event.update({
      where: { id: req.params.eventId },
      data: {
        title: title || undefined,
        description: description || undefined,
        coverImage: coverImage || undefined,
        category: category || undefined,
        mode: mode || undefined,
        registrationType: registrationType || undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        location: location || undefined,
        onlineLink: onlineLink || undefined,
        capacity: capacity !== undefined ? capacity : undefined,
        isPublished: isPublished !== undefined ? isPublished : undefined,
        isRegistrationOpen: isRegistrationOpen !== undefined ? isRegistrationOpen : undefined,
      },
    })

    res.json({
      message: "Event updated",
      event: { id: updated.id, title: updated.title, slug: updated.slug },
    })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/events/:businessId/:eventId
router.delete("/:businessId/:eventId", businessMiddleware, async (req, res, next) => {
  try {
    await prisma.event.delete({
      where: { id: req.params.eventId },
    })
    res.json({ message: "Event deleted" })
  } catch (err) {
    next(err)
  }
})

// PUT /api/events/:businessId/:eventId/registration/:regId/status — approve/reject/waitlist
router.put("/:businessId/:eventId/registration/:regId/status", businessMiddleware, async (req, res, next) => {
  try {
    const { status } = req.body
    const validStatuses = ["PENDING", "APPROVED", "REJECTED", "WAITLISTED", "REGISTERED", "CANCELLED", "CHECKED_IN"]

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" })
    }

    const registration = await prisma.eventRegistration.update({
      where: { id: req.params.regId },
      data: { status },
    })

    res.json({
      message: "Registration status updated",
      registration: {
        id: registration.id,
        status: registration.status,
        fullName: registration.fullName,
      },
    })
  } catch (err) {
    next(err)
  }
})

// PUT /api/events/:businessId/:eventId/registration/:regId/checkin — check in attendee
router.put("/:businessId/:eventId/registration/:regId/checkin", businessMiddleware, async (req, res, next) => {
  try {
    const registration = await prisma.eventRegistration.update({
      where: { id: req.params.regId },
      data: { checkedIn: true, status: "CHECKED_IN" },
    })

    res.json({
      message: "Checked in successfully",
      registration: {
        id: registration.id,
        fullName: registration.fullName,
        checkedIn: registration.checkedIn,
      },
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
