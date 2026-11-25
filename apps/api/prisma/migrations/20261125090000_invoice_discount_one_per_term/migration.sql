-- Discounts on invoices (given with payments), and one live invoice per
-- student, billing template and term: billing a template again for the same
-- term updates that invoice instead of adding another.

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "discount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "InvoiceStatusChange" ADD COLUMN "discount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- At most one invoice that isn't cancelled per student, template and term
-- (Prisma's schema can't express partial indexes, so it only exists here).
CREATE UNIQUE INDEX "Invoice_one_per_student_template_term"
  ON "Invoice" ("student_uuid", "template_uuid", "calendar_uuid")
  WHERE "status" <> 'CANCELLED';
