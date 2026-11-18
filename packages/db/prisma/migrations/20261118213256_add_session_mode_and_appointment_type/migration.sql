-- CreateEnum
CREATE TYPE "SessionMode" AS ENUM ('ONLINE', 'IN_PERSON', 'BOTH');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('ONLINE', 'IN_PERSON');

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "orderId" TEXT,
ADD COLUMN     "type" "AppointmentType" NOT NULL DEFAULT 'ONLINE';

-- AlterTable
ALTER TABLE "Package" ADD COLUMN     "sessionMode" "SessionMode" NOT NULL DEFAULT 'BOTH';

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
