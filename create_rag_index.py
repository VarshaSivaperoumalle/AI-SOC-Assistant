import os
import faiss
import pickle
from sentence_transformers import SentenceTransformer


# ---------------------------------------------------------
# 1. Paths
# ---------------------------------------------------------

KNOWLEDGE_FILE = "knowledge_base/security_knowledge.txt"
RAG_FOLDER = "knowledge_base/rag_index"

os.makedirs(RAG_FOLDER, exist_ok=True)


# ---------------------------------------------------------
# 2. Load knowledge base
# ---------------------------------------------------------

with open(KNOWLEDGE_FILE, "r", encoding="utf-8") as file:
    text = file.read()

print("Knowledge base loaded.")
print("Characters:", len(text))


# ---------------------------------------------------------
# 3. Split knowledge into chunks
# ---------------------------------------------------------

paragraphs = [
    paragraph.strip()
    for paragraph in text.split("\n\n")
    if paragraph.strip()
]

print("Knowledge chunks:", len(paragraphs))


# ---------------------------------------------------------
# 4. Load embedding model
# ---------------------------------------------------------

print("Loading embedding model...")

embedding_model = SentenceTransformer(
    "all-MiniLM-L6-v2"
)

print("Embedding model loaded.")


# ---------------------------------------------------------
# 5. Create embeddings
# ---------------------------------------------------------

print("Creating embeddings...")

embeddings = embedding_model.encode(
    paragraphs,
    convert_to_numpy=True,
    show_progress_bar=True
)

print("Embeddings created.")
print("Embedding shape:", embeddings.shape)


# ---------------------------------------------------------
# 6. Create FAISS index
# ---------------------------------------------------------

dimension = embeddings.shape[1]

index = faiss.IndexFlatL2(dimension)

index.add(embeddings.astype("float32"))

print("FAISS index created.")
print("Indexed chunks:", index.ntotal)


# ---------------------------------------------------------
# 7. Save FAISS index
# ---------------------------------------------------------

index_path = os.path.join(
    RAG_FOLDER,
    "security_knowledge.index"
)

faiss.write_index(index, index_path)


# ---------------------------------------------------------
# 8. Save original text chunks
# ---------------------------------------------------------

chunks_path = os.path.join(
    RAG_FOLDER,
    "security_chunks.pkl"
)

with open(chunks_path, "wb") as file:
    pickle.dump(paragraphs, file)


# ---------------------------------------------------------
# 9. Completion
# ---------------------------------------------------------

print()
print("RAG index created successfully.")
print("FAISS index:", index_path)
print("Chunks:", chunks_path)