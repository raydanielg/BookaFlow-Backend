const express = require("express")
const { prisma } = require("../config/prisma")

const router = express.Router()

// GET /api/public/:slug — public business profile (no auth)
router.get("/:slug", async (req, res, next) => {
  try {
    const business = await prisma.business.findUnique({
      where: { slug: req.params.slug },
      include: {
        profile: true,
        services: {
          where: { isActive: true, availableOnline: true },
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            price: true,
            duration: true,
            deposit: true,
          },
        },
        staff: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            title: true,
          },
        },
        reviews: {
          where: { isReported: false },
          select: {
            id: true,
            customerName: true,
            rating: true,
            comment: true,
            reply: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        workingHours: {
          where: { staffId: null },
          orderBy: { day: "asc" },
        },
      },
    })

    if (!business) {
      return res.status(404).json({ error: "Business not found" })
    }

    if (business.profileVisibility === "PRIVATE") {
      return res.status(403).json({ error: "This profile is private" })
    }

    const avgRating = business.reviews.length > 0
      ? business.reviews.reduce((sum, r) => sum + r.rating, 0) / business.reviews.length
      : null

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
        bookingLink: business.bookingLink,
        gallery: business.gallery ? JSON.parse(business.gallery) : [],
        bio: business.bio,
        yearsOfExperience: business.yearsOfExperience,
        specialties: business.specialties ? business.specialties.split(",").map(s => s.trim()).filter(Boolean) : [],
        languages: business.languages ? business.languages.split(",").map(s => s.trim()).filter(Boolean) : [],
        certifications: business.certifications ? JSON.parse(business.certifications) : [],
        workingHours: business.workingHours,
      },
      seo: business.profile
        ? {
            seoTitle: business.profile.seoTitle,
            metaDescription: business.profile.metaDescription,
            focusKeywords: business.profile.focusKeywords,
            ogTitle: business.profile.ogTitle,
            ogDescription: business.profile.ogDescription,
            ogImage: business.profile.ogImage,
            canonicalUrl: business.profile.canonicalUrl,
          }
        : null,
      services: business.services.map((s) => ({
        ...s,
        price: Number(s.price),
        deposit: s.deposit ? Number(s.deposit) : null,
      })),
      staff: business.staff,
      reviews: business.reviews,
      rating: avgRating ? Math.round(avgRating * 10) / 10 : null,
      reviewCount: business.reviews.length,
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/public/:slug/services — public services list
router.get("/:slug/services", async (req, res, next) => {
  try {
    const business = await prisma.business.findUnique({
      where: { slug: req.params.slug },
      select: { id: true },
    })

    if (!business) {
      return res.status(404).json({ error: "Business not found" })
    }

    const services = await prisma.service.findMany({
      where: { businessId: business.id, isActive: true, availableOnline: true },
      include: {
        staff: { include: { staff: { select: { id: true, name: true, title: true } } } },
      },
    })

    res.json({
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        category: s.category,
        price: Number(s.price),
        duration: s.duration,
        deposit: s.deposit ? Number(s.deposit) : null,
        staff: s.staff.map((ss) => ss.staff),
      })),
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/public/:slug/reviews — submit a review (no auth)
const { z } = require("zod")
const reviewSchema = z.object({
  customerName: z.string().min(2, "Name is required"),
  customerPhone: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
})

router.post("/:slug/reviews", async (req, res, next) => {
  try {
    const parsed = reviewSchema.parse(req.body)

    const business = await prisma.business.findUnique({
      where: { slug: req.params.slug },
      select: { id: true },
    })

    if (!business) {
      return res.status(404).json({ error: "Business not found" })
    }

    const review = await prisma.review.create({
      data: {
        businessId: business.id,
        customerName: parsed.customerName,
        customerPhone: parsed.customerPhone,
        rating: parsed.rating,
        comment: parsed.comment,
      },
    })

    res.status(201).json({ message: "Review submitted", review })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation failed",
        details: err.errors.map((e) => ({ field: e.path.join("."), message: e.message })),
      })
    }
    next(err)
  }
})

module.exports = router
