# BookaFlow Booking Platform Backend

B2B SaaS booking & scheduling platform — Node.js + Express + Prisma + PostgreSQL

## Setup

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account + business |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user + businesses |

### Business
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/business/:businessId` | Business profile |
| PUT | `/api/business/:businessId` | Update profile |
| GET | `/api/business/:businessId/dashboard` | Overview stats |
| GET/POST | `/api/business/:businessId/working-hours` | Business hours |

### Services
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/services/:businessId` | List services |
| POST | `/api/services/:businessId` | Add service |
| PUT | `/api/services/:businessId/:id` | Update service |
| DELETE | `/api/services/:businessId/:id` | Delete service |

### Staff
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/staff/:businessId` | List staff |
| POST | `/api/staff/:businessId` | Add staff |
| PUT | `/api/staff/:businessId/:id` | Update staff |
| DELETE | `/api/staff/:businessId/:id` | Remove staff |
| POST | `/api/staff/:businessId/:id/working-hours` | Set staff hours |

### Appointments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/appointments/:businessId` | List (filter by date) |
| POST | `/api/appointments/:businessId` | Create appointment |
| PUT | `/api/appointments/:businessId/:id/status` | Update status |
| PUT | `/api/appointments/:businessId/:id/reschedule` | Reschedule |
| GET | `/api/appointments/:businessId/available-slots` | Available slots |

### Customers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers/:businessId` | List (search) |
| GET | `/api/customers/:businessId/:id` | Customer details + history |
| POST | `/api/customers/:businessId` | Add customer |
| PUT | `/api/customers/:businessId/:id` | Update customer |

### Public Booking (no auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/booking/:slug` | Business profile + services |
| GET | `/api/booking/:slug/slots` | Available time slots |
| POST | `/api/booking/:slug` | Create booking |

## Seed Account
- **Email:** owner@beauty-house.com
- **Password:** password123
- **Business:** Beauty House (slug: beauty-house)

## Tech Stack
- Express.js + Helmet + CORS
- Prisma ORM + PostgreSQL
- JWT authentication
- Zod validation
- Nodemailer for notifications
