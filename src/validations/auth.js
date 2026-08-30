const { z } = require("zod")

const signupSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  businessName: z.string().min(2, "Business name is required"),
  businessType: z.enum(["SALON", "CLINIC", "SPA", "GYM", "CONSULTATION", "OTHER"]).optional(),
})

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

const serviceSchema = z.object({
  name: z.string().min(2, "Service name is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  price: z.number().min(0, "Price must be positive"),
  duration: z.number().min(5, "Duration must be at least 5 minutes"),
  deposit: z.number().min(0).optional(),
  availableOnline: z.boolean().optional(),
  staffIds: z.array(z.string()).optional(),
})

const staffSchema = z.object({
  name: z.string().min(2, "Staff name is required"),
  title: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  serviceIds: z.array(z.string()).optional(),
})

const appointmentSchema = z.object({
  serviceId: z.string().min(1, "Service is required"),
  staffId: z.string().min(1, "Staff is required"),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  customerName: z.string().min(2, "Customer name is required"),
  customerPhone: z.string().min(5, "Phone is required"),
  customerEmail: z.string().email().optional(),
  notes: z.string().optional(),
})

const updateAppointmentStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]),
})

const workingHoursSchema = z.object({
  day: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]),
  startTime: z.string(),
  endTime: z.string(),
  isOff: z.boolean().optional(),
})

const customerSchema = z.object({
  name: z.string().min(2, "Customer name is required"),
  phone: z.string().min(5, "Phone is required"),
  email: z.string().email().optional(),
  notes: z.string().optional(),
})

const businessProfileSchema = z.object({
  name: z.string().min(2).optional(),
  type: z.enum(["SALON", "CLINIC", "SPA", "GYM", "CONSULTATION", "OTHER"]).optional(),
  description: z.string().optional(),
  shortDescription: z.string().max(200).optional(),
  logo: z.string().optional(),
  coverImage: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  googleMapsLink: z.string().optional(),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  tiktok: z.string().optional(),
  whatsapp: z.string().optional(),
  profileVisibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
  bookingVisibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
})

const seoSchema = z.object({
  seoTitle: z.string().max(60).optional(),
  metaDescription: z.string().max(160).optional(),
  focusKeywords: z.string().optional(),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogImage: z.string().optional(),
  canonicalUrl: z.string().optional(),
})

const bookingSettingsSchema = z.object({
  bookingEnabled: z.boolean().optional(),
  advanceBookingDays: z.number().int().min(1).max(365).optional(),
  minimumNoticeHours: z.number().int().min(0).max(168).optional(),
  cancellationAllowed: z.boolean().optional(),
  cancellationDeadlineHours: z.number().int().min(0).optional(),
  reschedulingAllowed: z.boolean().optional(),
  noShowProtection: z.boolean().optional(),
  requirePhone: z.boolean().optional(),
  requireEmail: z.boolean().optional(),
  bufferMinutes: z.number().int().min(0).max(120).optional(),
  maxDailyBookings: z.number().int().min(1).optional(),
  allowDoubleBooking: z.boolean().optional(),
  autoConfirm: z.boolean().optional(),
  requireStaffSelection: z.boolean().optional(),
  allowCustomerNotes: z.boolean().optional(),
  paymentMode: z.enum(["PAY_AT_VENUE", "FULL_PAYMENT", "DEPOSIT"]).optional(),
})

module.exports = {
  signupSchema,
  loginSchema,
  serviceSchema,
  staffSchema,
  appointmentSchema,
  updateAppointmentStatusSchema,
  workingHoursSchema,
  customerSchema,
  businessProfileSchema,
  seoSchema,
  bookingSettingsSchema,
}
