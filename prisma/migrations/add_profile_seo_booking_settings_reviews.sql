-- Migration: add_profile_seo_booking_settings_reviews
-- Run this on your PostgreSQL database

-- Add new columns to businesses table
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "shortDescription" TEXT;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "coverImage" TEXT;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "region" TEXT;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "googleMapsLink" TEXT;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "instagram" TEXT;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "facebook" TEXT;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "tiktok" TEXT;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "whatsapp" TEXT;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "profileVisibility" TEXT NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "bookingVisibility" TEXT NOT NULL DEFAULT 'PUBLIC';

-- Add new columns to services table
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "deposit" DECIMAL(12,2);
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "availableOnline" BOOLEAN NOT NULL DEFAULT true;

-- Create business_profiles table
CREATE TABLE IF NOT EXISTS "business_profiles" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "seoTitle" TEXT,
    "metaDescription" TEXT,
    "focusKeywords" TEXT,
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "ogImage" TEXT,
    "canonicalUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "business_profiles_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on businessId
CREATE UNIQUE INDEX IF NOT EXISTS "business_profiles_businessId_key" ON "business_profiles"("businessId");

-- Add foreign key
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE;

-- Create booking_settings table
CREATE TABLE IF NOT EXISTS "booking_settings" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "bookingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "advanceBookingDays" INTEGER NOT NULL DEFAULT 30,
    "minimumNoticeHours" INTEGER NOT NULL DEFAULT 2,
    "cancellationAllowed" BOOLEAN NOT NULL DEFAULT true,
    "cancellationDeadlineHours" INTEGER NOT NULL DEFAULT 6,
    "reschedulingAllowed" BOOLEAN NOT NULL DEFAULT true,
    "noShowProtection" BOOLEAN NOT NULL DEFAULT true,
    "requirePhone" BOOLEAN NOT NULL DEFAULT true,
    "requireEmail" BOOLEAN NOT NULL DEFAULT false,
    "bufferMinutes" INTEGER NOT NULL DEFAULT 0,
    "maxDailyBookings" INTEGER NOT NULL DEFAULT 50,
    "allowDoubleBooking" BOOLEAN NOT NULL DEFAULT false,
    "autoConfirm" BOOLEAN NOT NULL DEFAULT true,
    "requireStaffSelection" BOOLEAN NOT NULL DEFAULT false,
    "allowCustomerNotes" BOOLEAN NOT NULL DEFAULT true,
    "paymentMode" TEXT NOT NULL DEFAULT 'PAY_AT_VENUE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "booking_settings_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on businessId
CREATE UNIQUE INDEX IF NOT EXISTS "booking_settings_businessId_key" ON "booking_settings"("businessId");

-- Add foreign key
ALTER TABLE "booking_settings" ADD CONSTRAINT "booking_settings_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE;

-- Create reviews table
CREATE TABLE IF NOT EXISTS "reviews" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "reply" TEXT,
    "isReported" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- Add foreign key
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE;

-- Create index on businessId for reviews
CREATE INDEX IF NOT EXISTS "reviews_businessId_idx" ON "reviews"("businessId");
