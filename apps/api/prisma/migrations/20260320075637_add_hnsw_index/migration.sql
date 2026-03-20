CREATE INDEX IF NOT EXISTS embedding_vector_hnsw_idx
ON "Embedding"
USING hnsw (vector vector_cosine_ops)
WITH (m = 16, ef_construction = 64);