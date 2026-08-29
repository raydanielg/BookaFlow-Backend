const swaggerJsdoc = require("swagger-jsdoc")

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "BookaFlow Booking API",
      version: "1.0.0",
      description: "B2B SaaS booking & scheduling platform API",
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 4000}`,
        description: "Local server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      { name: "Health", description: "Health check" },
      { name: "Auth", description: "Authentication endpoints" },
      { name: "Business", description: "Business profile & dashboard" },
      { name: "Services", description: "Service management" },
      { name: "Staff", description: "Staff management" },
      { name: "Appointments", description: "Appointment management" },
      { name: "Customers", description: "Customer management" },
      { name: "Booking", description: "Public booking (no auth required)" },
    ],
  },
  apis: ["./src/routes/*.js"],
}

const swaggerSpec = swaggerJsdoc(options)

module.exports = swaggerSpec
