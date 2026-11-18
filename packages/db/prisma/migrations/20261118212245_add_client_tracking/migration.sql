-- CreateEnum
CREATE TYPE "MealLogStatus" AS ENUM ('EATEN', 'PARTIAL', 'SKIPPED');

-- CreateTable
CREATE TABLE "MealItemLog" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "dietPlanMealItemId" TEXT NOT NULL,
    "logDate" DATE NOT NULL,
    "status" "MealLogStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealItemLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodLogEntry" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "logDate" DATE NOT NULL,
    "mealType" "MealType" NOT NULL,
    "foodItemId" TEXT,
    "customName" TEXT,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unit" "MeasurementUnit" NOT NULL,
    "calories" DECIMAL(65,30) NOT NULL,
    "protein" DECIMAL(65,30) NOT NULL,
    "carbs" DECIMAL(65,30) NOT NULL,
    "fat" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FoodLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaterLog" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "logDate" DATE NOT NULL,
    "amountMl" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaterLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DayComment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "dietitianId" TEXT NOT NULL,
    "logDate" DATE NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DayComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MealItemLog_clientId_logDate_idx" ON "MealItemLog"("clientId", "logDate");

-- CreateIndex
CREATE UNIQUE INDEX "MealItemLog_dietPlanMealItemId_logDate_key" ON "MealItemLog"("dietPlanMealItemId", "logDate");

-- CreateIndex
CREATE INDEX "FoodLogEntry_clientId_logDate_idx" ON "FoodLogEntry"("clientId", "logDate");

-- CreateIndex
CREATE INDEX "WaterLog_clientId_logDate_idx" ON "WaterLog"("clientId", "logDate");

-- CreateIndex
CREATE INDEX "DayComment_clientId_logDate_idx" ON "DayComment"("clientId", "logDate");

-- AddForeignKey
ALTER TABLE "MealItemLog" ADD CONSTRAINT "MealItemLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealItemLog" ADD CONSTRAINT "MealItemLog_dietPlanMealItemId_fkey" FOREIGN KEY ("dietPlanMealItemId") REFERENCES "DietPlanMealItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodLogEntry" ADD CONSTRAINT "FoodLogEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodLogEntry" ADD CONSTRAINT "FoodLogEntry_foodItemId_fkey" FOREIGN KEY ("foodItemId") REFERENCES "FoodItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaterLog" ADD CONSTRAINT "WaterLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayComment" ADD CONSTRAINT "DayComment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayComment" ADD CONSTRAINT "DayComment_dietitianId_fkey" FOREIGN KEY ("dietitianId") REFERENCES "DietitianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
