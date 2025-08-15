-- CreateTable
CREATE TABLE "public"."UdyamStep1Submission" (
    "id" TEXT NOT NULL,
    "aadhaarNumber" TEXT NOT NULL,
    "entrepreneurName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UdyamStep1Submission_pkey" PRIMARY KEY ("id")
);
