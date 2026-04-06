-- CreateEnum
CREATE TYPE "CrawlScope" AS ENUM ('SINGLE_PAGE', 'PATH_PREFIX', 'SUBDOMAIN');

-- CreateEnum
CREATE TYPE "CrawlStatus" AS ENUM ('PENDING', 'CRAWLING', 'READY', 'ERROR');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "webSourceId" TEXT;

-- CreateTable
CREATE TABLE "WebSource" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "scope" "CrawlScope" NOT NULL DEFAULT 'SUBDOMAIN',
    "pageLimit" INTEGER NOT NULL DEFAULT 200,
    "autoRecrawl" BOOLEAN NOT NULL DEFAULT false,
    "status" "CrawlStatus" NOT NULL DEFAULT 'PENDING',
    "crawledAt" TIMESTAMP(3),
    "pageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "WebSource_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_webSourceId_fkey" FOREIGN KEY ("webSourceId") REFERENCES "WebSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebSource" ADD CONSTRAINT "WebSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
