-- Phase 2: RPJMDes, APBDes SDG tagging, Pertanian, RT/RW partisipasi

ALTER TABLE "budgets" ADD COLUMN "sdgGoalIds" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "transactions" ADD COLUMN "sdgGoalIds" JSONB NOT NULL DEFAULT '[]';

CREATE TABLE "rpjmdes_plans" (
    "id" SERIAL NOT NULL,
    "villageId" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "periodStart" INTEGER NOT NULL,
    "periodEnd" INTEGER NOT NULL,
    "vision" TEXT,
    "mission" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rpjmdes_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rkpdes_activities" (
    "id" SERIAL NOT NULL,
    "planId" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "year" INTEGER NOT NULL,
    "location" VARCHAR(255),
    "estimatedBudget" DECIMAL(15,2),
    "sdgGoalIds" JSONB NOT NULL DEFAULT '[]',
    "priorityScore" DOUBLE PRECISION,
    "status" VARCHAR(50) NOT NULL DEFAULT 'planned',
    "source" VARCHAR(50) NOT NULL DEFAULT 'internal',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rkpdes_activities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "musdes_proposals" (
    "id" SERIAL NOT NULL,
    "villageId" INTEGER NOT NULL,
    "planId" INTEGER,
    "proposerName" VARCHAR(255) NOT NULL,
    "proposerNik" VARCHAR(16),
    "rt" VARCHAR(10),
    "rw" VARCHAR(10),
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "sdgGoalIds" JSONB NOT NULL DEFAULT '[]',
    "status" VARCHAR(50) NOT NULL DEFAULT 'submitted',
    "priorityScore" DOUBLE PRECISION,
    "mergedActivityId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "musdes_proposals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "farm_plots" (
    "id" SERIAL NOT NULL,
    "villageId" INTEGER NOT NULL,
    "potentialId" INTEGER,
    "name" VARCHAR(255) NOT NULL,
    "location" VARCHAR(255),
    "areaHa" DOUBLE PRECISION,
    "cropType" VARCHAR(100),
    "ownerName" VARCHAR(255),
    "rt" VARCHAR(10),
    "rw" VARCHAR(10),
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farm_plots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crop_cycles" (
    "id" SERIAL NOT NULL,
    "plotId" INTEGER NOT NULL,
    "season" VARCHAR(100) NOT NULL,
    "cropName" VARCHAR(255) NOT NULL,
    "plantedAt" DATE,
    "harvestExpectedAt" DATE,
    "status" VARCHAR(50) NOT NULL DEFAULT 'planted',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crop_cycles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "harvest_records" (
    "id" SERIAL NOT NULL,
    "cycleId" INTEGER NOT NULL,
    "harvestDate" DATE NOT NULL,
    "quantityKg" DOUBLE PRECISION,
    "qualityGrade" VARCHAR(50),
    "marketPricePerKg" DECIMAL(15,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "harvest_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rt_rw_activities" (
    "id" SERIAL NOT NULL,
    "villageId" INTEGER NOT NULL,
    "rt" VARCHAR(10) NOT NULL,
    "rw" VARCHAR(10) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "activityType" VARCHAR(50) NOT NULL,
    "activityDate" DATE NOT NULL,
    "participantCount" INTEGER NOT NULL DEFAULT 0,
    "budgetUsed" DECIMAL(15,2),
    "sdgGoalIds" JSONB NOT NULL DEFAULT '[]',
    "status" VARCHAR(50) NOT NULL DEFAULT 'planned',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rt_rw_activities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "community_proposals" (
    "id" SERIAL NOT NULL,
    "villageId" INTEGER NOT NULL,
    "proposerName" VARCHAR(255) NOT NULL,
    "rt" VARCHAR(10),
    "rw" VARCHAR(10),
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "proposalType" VARCHAR(50) NOT NULL DEFAULT 'infrastructure',
    "sdgGoalIds" JSONB NOT NULL DEFAULT '[]',
    "status" VARCHAR(50) NOT NULL DEFAULT 'submitted',
    "votesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_proposals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "musdes_proposals_mergedActivityId_key" ON "musdes_proposals"("mergedActivityId");
CREATE INDEX "rpjmdes_plans_villageId_status_idx" ON "rpjmdes_plans"("villageId", "status");
CREATE INDEX "rkpdes_activities_planId_year_idx" ON "rkpdes_activities"("planId", "year");
CREATE INDEX "rkpdes_activities_planId_status_idx" ON "rkpdes_activities"("planId", "status");
CREATE INDEX "musdes_proposals_villageId_status_idx" ON "musdes_proposals"("villageId", "status");
CREATE INDEX "musdes_proposals_planId_idx" ON "musdes_proposals"("planId");
CREATE INDEX "farm_plots_villageId_status_idx" ON "farm_plots"("villageId", "status");
CREATE INDEX "crop_cycles_plotId_status_idx" ON "crop_cycles"("plotId", "status");
CREATE INDEX "harvest_records_cycleId_harvestDate_idx" ON "harvest_records"("cycleId", "harvestDate" DESC);
CREATE INDEX "rt_rw_activities_villageId_activityDate_idx" ON "rt_rw_activities"("villageId", "activityDate" DESC);
CREATE INDEX "rt_rw_activities_villageId_rt_rw_idx" ON "rt_rw_activities"("villageId", "rt", "rw");
CREATE INDEX "community_proposals_villageId_status_idx" ON "community_proposals"("villageId", "status");

ALTER TABLE "rpjmdes_plans" ADD CONSTRAINT "rpjmdes_plans_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "villages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rkpdes_activities" ADD CONSTRAINT "rkpdes_activities_planId_fkey" FOREIGN KEY ("planId") REFERENCES "rpjmdes_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "musdes_proposals" ADD CONSTRAINT "musdes_proposals_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "villages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "musdes_proposals" ADD CONSTRAINT "musdes_proposals_planId_fkey" FOREIGN KEY ("planId") REFERENCES "rpjmdes_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "musdes_proposals" ADD CONSTRAINT "musdes_proposals_mergedActivityId_fkey" FOREIGN KEY ("mergedActivityId") REFERENCES "rkpdes_activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "farm_plots" ADD CONSTRAINT "farm_plots_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "villages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "farm_plots" ADD CONSTRAINT "farm_plots_potentialId_fkey" FOREIGN KEY ("potentialId") REFERENCES "potentials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crop_cycles" ADD CONSTRAINT "crop_cycles_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "farm_plots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "harvest_records" ADD CONSTRAINT "harvest_records_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "crop_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rt_rw_activities" ADD CONSTRAINT "rt_rw_activities_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "villages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_proposals" ADD CONSTRAINT "community_proposals_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "villages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
