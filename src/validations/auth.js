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
  price: z.number().min(0, "Price must be positive"),
  duration: z.number().min(5, "Duration must be at least 5 minutes"),
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
  name: z.string().min(2),
  description: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
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
}
