-- DropIndex
DROP INDEX "embedding_vector_hnsw_idx";

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "metadata" JSONB;
