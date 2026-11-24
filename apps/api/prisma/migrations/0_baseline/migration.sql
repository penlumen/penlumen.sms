-- The whole schema as of 2026-11-24, replacing the migrations before it.
-- Databases that already had those: mark this applied (see
-- docs/migrations.md) instead of running it.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ROOT', 'ADMIN', 'STAFF', 'PARENT');

-- CreateEnum
CREATE TYPE "Position" AS ENUM ('ADMINISTRATIVE', 'ACADEMIC', 'GUARDIAN', 'PARENT');

-- CreateEnum
CREATE TYPE "ResultStatus" AS ENUM ('APPROVED', 'PENDING', 'REJECTED');

-- CreateEnum
CREATE TYPE "CalendarStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PENDING', 'PRESENT', 'ABSENT');

-- CreateEnum
CREATE TYPE "BillingTemplateStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PART_PAYMENT', 'FULL_PAYMENT', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "OnlinePaymentStatus" AS ENUM ('PENDING', 'AWAITING_CONFIRMATION', 'SUCCESS', 'FAILED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "WebhookStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "school_uuid" TEXT,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "contact" TEXT,
    "alt_contact" TEXT,
    "avatar" TEXT,
    "address" TEXT,
    "role" "Role" NOT NULL DEFAULT 'ADMIN',
    "position" "Position" NOT NULL DEFAULT 'GUARDIAN',
    "status" TEXT NOT NULL DEFAULT 'active',
    "last_branch_uuid" TEXT,
    "face_descriptor" DOUBLE PRECISION[] NOT NULL,
    "walkthrough_seen_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessControl" (
    "id" SERIAL NOT NULL,
    "user_uuid" TEXT NOT NULL,
    "branch_uuid" TEXT NOT NULL,
    "access" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "write" BOOLEAN NOT NULL DEFAULT false,
    "delete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "School" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "avatar" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "zip" TEXT,
    "website_enabled" BOOLEAN NOT NULL DEFAULT true,
    "subtext" TEXT,
    "about" TEXT,
    "mission" TEXT,
    "vision" TEXT,
    "features" JSONB,
    "values" JSONB,
    "theme" JSONB,
    "payments_enabled" BOOLEAN NOT NULL DEFAULT false,
    "paystack_public_key" TEXT,
    "paystack_secret_key" TEXT,
    "allow_part_payment" BOOLEAN NOT NULL DEFAULT true,
    "parent_pays_fees" BOOLEAN NOT NULL DEFAULT false,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "smtp" JSONB,
    "email_types" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolFacility" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "school_uuid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolFacility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryCategory" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "school_uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleryCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryImage" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "school_uuid" TEXT NOT NULL,
    "category_uuid" TEXT,
    "title" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleryImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "school_uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "contact" TEXT,
    "avatar" TEXT,
    "address" TEXT,
    "reg_prefix" TEXT,
    "reg_include_year" BOOLEAN NOT NULL DEFAULT true,
    "assessment_max" INTEGER NOT NULL DEFAULT 40,
    "examination_max" INTEGER NOT NULL DEFAULT 60,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchAccess" (
    "id" SERIAL NOT NULL,
    "role" "Role" NOT NULL,
    "user_uuid" TEXT NOT NULL,
    "school_uuid" TEXT NOT NULL,
    "branch_uuid" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BranchAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Calendar" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "branch_uuid" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "term" TEXT,
    "open_date" TIMESTAMP(3),
    "close_date" TIMESTAMP(3),
    "next_term_resumption_date" TIMESTAMP(3),
    "status" "CalendarStatus" NOT NULL DEFAULT 'INACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Calendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "parent_uuid" TEXT,
    "branch_uuid" TEXT NOT NULL,
    "class_uuid" TEXT NOT NULL,
    "reg_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT,
    "date_of_birth" DATE,
    "avatar" TEXT,
    "face_descriptor" DOUBLE PRECISION[] NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "pin_hash" TEXT,
    "pin_failed" INTEGER NOT NULL DEFAULT 0,
    "pin_locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Class" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "branch_uuid" TEXT NOT NULL,
    "teacher_uuid" TEXT,
    "teachers_uuid" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "name" TEXT NOT NULL,
    "capacity" INTEGER DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "class_uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grade" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "branch_uuid" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "grade" TEXT NOT NULL,
    "remark" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Result" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "student_uuid" TEXT NOT NULL,
    "calendar_uuid" TEXT NOT NULL,
    "class_uuid" TEXT NOT NULL,
    "class_name" TEXT NOT NULL,
    "overall" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "ResultStatus" NOT NULL DEFAULT 'PENDING',
    "approval_requested" BOOLEAN NOT NULL DEFAULT false,
    "teacher_remark" TEXT,
    "principal_remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultAssessments" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "result_uuid" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "assessment" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "examination" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "overall" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "grade" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResultAssessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentAttendance" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "student_uuid" TEXT NOT NULL,
    "branch_uuid" TEXT NOT NULL,
    "class_uuid" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "marked_by_uuid" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffAttendance" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "staff_uuid" TEXT NOT NULL,
    "branch_uuid" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "marked_by_uuid" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "calendar_uuid" TEXT NOT NULL,
    "branch_uuid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" DATE NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "location" TEXT,
    "tag_all_staff" BOOLEAN NOT NULL DEFAULT false,
    "tag_all_parents" BOOLEAN NOT NULL DEFAULT false,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_by_uuid" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventTag" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "event_uuid" TEXT NOT NULL,
    "user_uuid" TEXT NOT NULL,
    "tag_type" TEXT NOT NULL,

    CONSTRAINT "EventTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "user_uuid" TEXT NOT NULL,
    "branch_uuid" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceToken" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "user_uuid" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingTemplate" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "branch_uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "BillingTemplateStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingTemplateItem" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "template_uuid" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "branch_uuid" TEXT NOT NULL,
    "student_uuid" TEXT NOT NULL,
    "template_uuid" TEXT,
    "class_uuid" TEXT,
    "calendar_uuid" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "total" DECIMAL(12,2) NOT NULL,
    "paid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "issued_at" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_at" DATE,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "invoice_uuid" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "amount" DECIMAL(12,2) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceStatusChange" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "invoice_uuid" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "description" TEXT,
    "created_by_uuid" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceStatusChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnlinePayment" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "school_uuid" TEXT NOT NULL,
    "branch_uuid" TEXT NOT NULL,
    "invoice_uuid" TEXT NOT NULL,
    "user_uuid" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "OnlinePaymentStatus" NOT NULL DEFAULT 'PENDING',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "channel" TEXT,
    "note" TEXT,
    "confirmed_by_uuid" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnlinePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "school_uuid" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL,
    "via" TEXT NOT NULL,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordToken" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "user_uuid" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationApp" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "school_uuid" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "app_url" TEXT,
    "redirect_uris" TEXT[],
    "client_id" TEXT NOT NULL,
    "client_secret_hash" TEXT,
    "client_secret_hint" TEXT,
    "webhook_url" TEXT,
    "webhook_secret" TEXT,
    "webhook_events" TEXT[],
    "disabled_branch_uuids" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OidcCode" (
    "id" SERIAL NOT NULL,
    "code_hash" TEXT NOT NULL,
    "app_uuid" TEXT NOT NULL,
    "subject_uuid" TEXT NOT NULL,
    "subject_type" TEXT NOT NULL,
    "redirect_uri" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "nonce" TEXT,
    "code_challenge" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OidcCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OidcToken" (
    "id" SERIAL NOT NULL,
    "token_hash" TEXT NOT NULL,
    "app_uuid" TEXT NOT NULL,
    "subject_uuid" TEXT,
    "subject_type" TEXT,
    "scope" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OidcToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OidcKey" (
    "id" SERIAL NOT NULL,
    "kid" TEXT NOT NULL,
    "private_key" TEXT NOT NULL,
    "public_jwk" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OidcKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "app_uuid" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "response_status" INTEGER,
    "error" TEXT,
    "delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffectiveTrait" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "branch_uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffectiveTrait_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffectiveRating" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "result_uuid" TEXT NOT NULL,
    "trait_uuid" TEXT,
    "trait_name" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffectiveRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_uuid_key" ON "User"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "User_school_uuid_email_role_key" ON "User"("school_uuid", "email", "role");

-- CreateIndex
CREATE UNIQUE INDEX "AccessControl_user_uuid_branch_uuid_access_key" ON "AccessControl"("user_uuid", "branch_uuid", "access");

-- CreateIndex
CREATE UNIQUE INDEX "School_uuid_key" ON "School"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "School_token_key" ON "School"("token");

-- CreateIndex
CREATE UNIQUE INDEX "School_email_key" ON "School"("email");

-- CreateIndex
CREATE UNIQUE INDEX "School_slug_key" ON "School"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolFacility_uuid_key" ON "SchoolFacility"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "GalleryCategory_uuid_key" ON "GalleryCategory"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "GalleryImage_uuid_key" ON "GalleryImage"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_uuid_key" ON "Branch"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "BranchAccess_user_uuid_branch_uuid_role_key" ON "BranchAccess"("user_uuid", "branch_uuid", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Calendar_uuid_key" ON "Calendar"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Student_uuid_key" ON "Student"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Student_branch_uuid_reg_number_key" ON "Student"("branch_uuid", "reg_number");

-- CreateIndex
CREATE UNIQUE INDEX "Class_uuid_key" ON "Class"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_uuid_key" ON "Subject"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_class_uuid_name_key" ON "Subject"("class_uuid", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_uuid_key" ON "Grade"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Result_uuid_key" ON "Result"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Result_calendar_uuid_class_uuid_student_uuid_key" ON "Result"("calendar_uuid", "class_uuid", "student_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "ResultAssessments_uuid_key" ON "ResultAssessments"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "ResultAssessments_result_uuid_subject_key" ON "ResultAssessments"("result_uuid", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "StudentAttendance_uuid_key" ON "StudentAttendance"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "StudentAttendance_student_uuid_date_key" ON "StudentAttendance"("student_uuid", "date");

-- CreateIndex
CREATE UNIQUE INDEX "StaffAttendance_uuid_key" ON "StaffAttendance"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "StaffAttendance_staff_uuid_date_key" ON "StaffAttendance"("staff_uuid", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Event_uuid_key" ON "Event"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "EventTag_uuid_key" ON "EventTag"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "EventTag_event_uuid_user_uuid_tag_type_key" ON "EventTag"("event_uuid", "user_uuid", "tag_type");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_uuid_key" ON "Notification"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceToken_uuid_key" ON "DeviceToken"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceToken_token_key" ON "DeviceToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "BillingTemplate_uuid_key" ON "BillingTemplate"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "BillingTemplateItem_uuid_key" ON "BillingTemplateItem"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_uuid_key" ON "Invoice"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceItem_uuid_key" ON "InvoiceItem"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceStatusChange_uuid_key" ON "InvoiceStatusChange"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "OnlinePayment_uuid_key" ON "OnlinePayment"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "OnlinePayment_reference_key" ON "OnlinePayment"("reference");

-- CreateIndex
CREATE INDEX "OnlinePayment_branch_uuid_status_idx" ON "OnlinePayment"("branch_uuid", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EmailLog_uuid_key" ON "EmailLog"("uuid");

-- CreateIndex
CREATE INDEX "EmailLog_school_uuid_created_at_idx" ON "EmailLog"("school_uuid", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordToken_uuid_key" ON "PasswordToken"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordToken_token_hash_key" ON "PasswordToken"("token_hash");

-- CreateIndex
CREATE INDEX "PasswordToken_user_uuid_idx" ON "PasswordToken"("user_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationApp_uuid_key" ON "IntegrationApp"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationApp_client_id_key" ON "IntegrationApp"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationApp_school_uuid_key_key" ON "IntegrationApp"("school_uuid", "key");

-- CreateIndex
CREATE UNIQUE INDEX "OidcCode_code_hash_key" ON "OidcCode"("code_hash");

-- CreateIndex
CREATE UNIQUE INDEX "OidcToken_token_hash_key" ON "OidcToken"("token_hash");

-- CreateIndex
CREATE INDEX "OidcToken_app_uuid_idx" ON "OidcToken"("app_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "OidcKey_kid_key" ON "OidcKey"("kid");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookDelivery_uuid_key" ON "WebhookDelivery"("uuid");

-- CreateIndex
CREATE INDEX "WebhookDelivery_app_uuid_created_at_idx" ON "WebhookDelivery"("app_uuid", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "AffectiveTrait_uuid_key" ON "AffectiveTrait"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "AffectiveRating_uuid_key" ON "AffectiveRating"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "AffectiveRating_result_uuid_trait_uuid_key" ON "AffectiveRating"("result_uuid", "trait_uuid");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_school_uuid_fkey" FOREIGN KEY ("school_uuid") REFERENCES "School"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_last_branch_uuid_fkey" FOREIGN KEY ("last_branch_uuid") REFERENCES "Branch"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessControl" ADD CONSTRAINT "AccessControl_user_uuid_fkey" FOREIGN KEY ("user_uuid") REFERENCES "User"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessControl" ADD CONSTRAINT "AccessControl_branch_uuid_fkey" FOREIGN KEY ("branch_uuid") REFERENCES "Branch"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolFacility" ADD CONSTRAINT "SchoolFacility_school_uuid_fkey" FOREIGN KEY ("school_uuid") REFERENCES "School"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryCategory" ADD CONSTRAINT "GalleryCategory_school_uuid_fkey" FOREIGN KEY ("school_uuid") REFERENCES "School"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryImage" ADD CONSTRAINT "GalleryImage_school_uuid_fkey" FOREIGN KEY ("school_uuid") REFERENCES "School"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryImage" ADD CONSTRAINT "GalleryImage_category_uuid_fkey" FOREIGN KEY ("category_uuid") REFERENCES "GalleryCategory"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_school_uuid_fkey" FOREIGN KEY ("school_uuid") REFERENCES "School"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchAccess" ADD CONSTRAINT "BranchAccess_user_uuid_fkey" FOREIGN KEY ("user_uuid") REFERENCES "User"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchAccess" ADD CONSTRAINT "BranchAccess_school_uuid_fkey" FOREIGN KEY ("school_uuid") REFERENCES "School"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchAccess" ADD CONSTRAINT "BranchAccess_branch_uuid_fkey" FOREIGN KEY ("branch_uuid") REFERENCES "Branch"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calendar" ADD CONSTRAINT "Calendar_branch_uuid_fkey" FOREIGN KEY ("branch_uuid") REFERENCES "Branch"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_parent_uuid_fkey" FOREIGN KEY ("parent_uuid") REFERENCES "User"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_branch_uuid_fkey" FOREIGN KEY ("branch_uuid") REFERENCES "Branch"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_class_uuid_fkey" FOREIGN KEY ("class_uuid") REFERENCES "Class"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_branch_uuid_fkey" FOREIGN KEY ("branch_uuid") REFERENCES "Branch"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_teacher_uuid_fkey" FOREIGN KEY ("teacher_uuid") REFERENCES "User"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_class_uuid_fkey" FOREIGN KEY ("class_uuid") REFERENCES "Class"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_branch_uuid_fkey" FOREIGN KEY ("branch_uuid") REFERENCES "Branch"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_calendar_uuid_fkey" FOREIGN KEY ("calendar_uuid") REFERENCES "Calendar"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_student_uuid_fkey" FOREIGN KEY ("student_uuid") REFERENCES "Student"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultAssessments" ADD CONSTRAINT "ResultAssessments_result_uuid_fkey" FOREIGN KEY ("result_uuid") REFERENCES "Result"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAttendance" ADD CONSTRAINT "StudentAttendance_student_uuid_fkey" FOREIGN KEY ("student_uuid") REFERENCES "Student"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAttendance" ADD CONSTRAINT "StudentAttendance_branch_uuid_fkey" FOREIGN KEY ("branch_uuid") REFERENCES "Branch"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAttendance" ADD CONSTRAINT "StudentAttendance_class_uuid_fkey" FOREIGN KEY ("class_uuid") REFERENCES "Class"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAttendance" ADD CONSTRAINT "StudentAttendance_marked_by_uuid_fkey" FOREIGN KEY ("marked_by_uuid") REFERENCES "User"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAttendance" ADD CONSTRAINT "StaffAttendance_staff_uuid_fkey" FOREIGN KEY ("staff_uuid") REFERENCES "User"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAttendance" ADD CONSTRAINT "StaffAttendance_branch_uuid_fkey" FOREIGN KEY ("branch_uuid") REFERENCES "Branch"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAttendance" ADD CONSTRAINT "StaffAttendance_marked_by_uuid_fkey" FOREIGN KEY ("marked_by_uuid") REFERENCES "User"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_calendar_uuid_fkey" FOREIGN KEY ("calendar_uuid") REFERENCES "Calendar"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_branch_uuid_fkey" FOREIGN KEY ("branch_uuid") REFERENCES "Branch"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_created_by_uuid_fkey" FOREIGN KEY ("created_by_uuid") REFERENCES "User"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTag" ADD CONSTRAINT "EventTag_event_uuid_fkey" FOREIGN KEY ("event_uuid") REFERENCES "Event"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTag" ADD CONSTRAINT "EventTag_user_uuid_fkey" FOREIGN KEY ("user_uuid") REFERENCES "User"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_uuid_fkey" FOREIGN KEY ("user_uuid") REFERENCES "User"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_branch_uuid_fkey" FOREIGN KEY ("branch_uuid") REFERENCES "Branch"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_user_uuid_fkey" FOREIGN KEY ("user_uuid") REFERENCES "User"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingTemplate" ADD CONSTRAINT "BillingTemplate_branch_uuid_fkey" FOREIGN KEY ("branch_uuid") REFERENCES "Branch"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingTemplateItem" ADD CONSTRAINT "BillingTemplateItem_template_uuid_fkey" FOREIGN KEY ("template_uuid") REFERENCES "BillingTemplate"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_branch_uuid_fkey" FOREIGN KEY ("branch_uuid") REFERENCES "Branch"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_student_uuid_fkey" FOREIGN KEY ("student_uuid") REFERENCES "Student"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_template_uuid_fkey" FOREIGN KEY ("template_uuid") REFERENCES "BillingTemplate"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_class_uuid_fkey" FOREIGN KEY ("class_uuid") REFERENCES "Class"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_calendar_uuid_fkey" FOREIGN KEY ("calendar_uuid") REFERENCES "Calendar"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoice_uuid_fkey" FOREIGN KEY ("invoice_uuid") REFERENCES "Invoice"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceStatusChange" ADD CONSTRAINT "InvoiceStatusChange_invoice_uuid_fkey" FOREIGN KEY ("invoice_uuid") REFERENCES "Invoice"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlinePayment" ADD CONSTRAINT "OnlinePayment_school_uuid_fkey" FOREIGN KEY ("school_uuid") REFERENCES "School"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlinePayment" ADD CONSTRAINT "OnlinePayment_branch_uuid_fkey" FOREIGN KEY ("branch_uuid") REFERENCES "Branch"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlinePayment" ADD CONSTRAINT "OnlinePayment_invoice_uuid_fkey" FOREIGN KEY ("invoice_uuid") REFERENCES "Invoice"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlinePayment" ADD CONSTRAINT "OnlinePayment_user_uuid_fkey" FOREIGN KEY ("user_uuid") REFERENCES "User"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_school_uuid_fkey" FOREIGN KEY ("school_uuid") REFERENCES "School"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordToken" ADD CONSTRAINT "PasswordToken_user_uuid_fkey" FOREIGN KEY ("user_uuid") REFERENCES "User"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationApp" ADD CONSTRAINT "IntegrationApp_school_uuid_fkey" FOREIGN KEY ("school_uuid") REFERENCES "School"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OidcCode" ADD CONSTRAINT "OidcCode_app_uuid_fkey" FOREIGN KEY ("app_uuid") REFERENCES "IntegrationApp"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OidcToken" ADD CONSTRAINT "OidcToken_app_uuid_fkey" FOREIGN KEY ("app_uuid") REFERENCES "IntegrationApp"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_app_uuid_fkey" FOREIGN KEY ("app_uuid") REFERENCES "IntegrationApp"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffectiveTrait" ADD CONSTRAINT "AffectiveTrait_branch_uuid_fkey" FOREIGN KEY ("branch_uuid") REFERENCES "Branch"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffectiveRating" ADD CONSTRAINT "AffectiveRating_result_uuid_fkey" FOREIGN KEY ("result_uuid") REFERENCES "Result"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffectiveRating" ADD CONSTRAINT "AffectiveRating_trait_uuid_fkey" FOREIGN KEY ("trait_uuid") REFERENCES "AffectiveTrait"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;


-- One active term per branch (Prisma can't express partial indexes).
CREATE UNIQUE INDEX "Calendar_one_active_per_branch"
  ON "Calendar" ("branch_uuid")
  WHERE "status" = 'ACTIVE';
