const { verifyToken } = require("../utils/jwt")
const { prisma } = require("../config/prisma")

async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized — no token provided" })
    }

    const token = header.split(" ")[1]
    const decoded = verifyToken(token)

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, fullName: true, role: true },
    })

    if (!user) {
      return res.status(401).json({ error: "Unauthorized — user not found" })
    }

    req.user = user
    next()
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized — invalid token" })
  }
}

async function businessMiddleware(req, res, next) {
  try {
    const businessId = req.params.businessId || req.headers["x-business-id"]
    if (!businessId) {
      return res.status(400).json({ error: "Business ID required" })
    }

    const member = await prisma.businessMember.findUnique({
      where: {
        userId_businessId: {
          userId: req.user.id,
          businessId,
        },
      },
      include: { business: true },
    })

    if (!member) {
      return res.status(403).json({ error: "You don't have access to this business" })
    }

    req.business = member.business
    req.businessId = businessId
    req.memberRole = member.role
    next()
  } catch (err) {
    next(err)
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden — insufficient permissions" })
    }
    next()
  }
}

module.exports = { authMiddleware, businessMiddleware, requireRole }
