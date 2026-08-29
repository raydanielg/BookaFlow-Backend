const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

async function main() {
  const password = await bcrypt.hash("password123", 10)

  // Create demo business owner
  const owner = await prisma.user.upsert({
    where: { email: "owner@beauty-house.com" },
    update: {},
    create: {
      email: "owner@beauty-house.com",
      fullName: "Sarah Johnson",
      password,
      role: "BUSINESS_OWNER",
    },
  })

  // Create business
  const business = await prisma.business.upsert({
    where: { slug: "beauty-house" },
    update: {},
    create: {
      name: "Beauty House",
      slug: "beauty-house",
      type: "SALON",
      description: "Professional beauty services",
      phone: "+255700000001",
      email: "info@beauty-house.com",
      address: "123 Main Street",
      city: "Dar es Salaam",
      bookingLink: "/book/beauty-house",
    },
  })

  // Link owner to business
  await prisma.businessMember.upsert({
    where: { userId_businessId: { userId: owner.id, businessId: business.id } },
    update: {},
    create: {
      userId: owner.id,
      businessId: business.id,
      role: "BUSINESS_OWNER",
    },
  })

  // Create services
  const haircut = await prisma.service.create({
    data: {
      businessId: business.id,
      name: "Haircut",
      price: 10000,
      duration: 30,
    },
  })

  const styling = await prisma.service.create({
    data: {
      businessId: business.id,
      name: "Hair Styling",
      price: 20000,
      duration: 45,
    },
  })

  const massage = await prisma.service.create({
    data: {
      businessId: business.id,
      name: "Massage",
      price: 30000,
      duration: 60,
    },
  })

  // Create staff
  const john = await prisma.staff.create({
    data: {
      businessId: business.id,
      name: "John Doe",
      title: "Hair Stylist",
      phone: "+255700000002",
      services: {
        create: [
          { serviceId: haircut.id },
          { serviceId: styling.id },
        ],
      },
    },
  })

  const mary = await prisma.staff.create({
    data: {
      businessId: business.id,
      name: "Mary Smith",
      title: "Therapist",
      phone: "+255700000003",
      services: {
        create: [{ serviceId: massage.id }],
      },
    },
  })

  // Set working hours for staff
  const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]
  for (const day of days) {
    await prisma.workingHours.create({
      data: { staffId: john.id, day, startTime: "08:00", endTime: "17:00" },
    })
    await prisma.workingHours.create({
      data: { staffId: mary.id, day, startTime: "09:00", endTime: "16:00" },
    })
  }

  console.log("Seed complete:")
  console.log("  Owner:", owner.email, "(password: password123)")
  console.log("  Business:", business.name, "— slug:", business.slug)
  console.log("  Services: Haircut, Hair Styling, Massage")
  console.log("  Staff: John Doe, Mary Smith")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
