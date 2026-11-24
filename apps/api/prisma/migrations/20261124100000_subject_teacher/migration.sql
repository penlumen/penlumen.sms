-- A teacher (academic staff) assigned to each class subject. Connected apps
-- (Exams) let them set tests and exams for the subjects they teach.

-- AlterTable
ALTER TABLE "Subject" ADD COLUMN "teacher_uuid" TEXT;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_teacher_uuid_fkey" FOREIGN KEY ("teacher_uuid") REFERENCES "User"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;
