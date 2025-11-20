-- Enable vector extension for pgvector (required for embeddings)
-- Migration: 20250101000002_enable_vector_extension

create extension if not exists vector;

