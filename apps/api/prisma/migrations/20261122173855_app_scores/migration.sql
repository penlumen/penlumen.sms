-- CreateEnum
CREATE TYPE "ScoreComponent" AS ENUM ('ASSESSMENT', 'EXAMINATION');

-- CreateTable
CREATE TABLE "AppScore" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "app_uuid" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "title" TEXT,
    "student_uuid" TEXT NOT NULL,
    "calendar_uuid" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "component" "ScoreComponent" NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppScore_uuid_key" ON "AppScore"("uuid");

-- CreateIndex
CREATE INDEX "AppScore_student_uuid_calendar_uuid_subject_component_idx" ON "AppScore"("student_uuid", "calendar_uuid", "subject", "component");

-- CreateIndex
CREATE UNIQUE INDEX "AppScore_app_uuid_source_id_student_uuid_key" ON "AppScore"("app_uuid", "source_id", "student_uuid");

-- AddForeignKey
ALTER TABLE "AppScore" ADD CONSTRAINT "AppScore_app_uuid_fkey" FOREIGN KEY ("app_uuid") REFERENCES "IntegrationApp"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppScore" ADD CONSTRAINT "AppScore_student_uuid_fkey" FOREIGN KEY ("student_uuid") REFERENCES "Student"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppScore" ADD CONSTRAINT "AppScore_calendar_uuid_fkey" FOREIGN KEY ("calendar_uuid") REFERENCES "Calendar"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
