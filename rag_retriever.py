import faiss
import pickle
from sentence_transformers import SentenceTransformer


INDEX_PATH = "knowledge_base/rag_index/security_knowledge.index"
CHUNKS_PATH = "knowledge_base/rag_index/security_chunks.pkl"
MODEL_NAME = "all-MiniLM-L6-v2"


index = faiss.read_index(INDEX_PATH)

with open(CHUNKS_PATH, "rb") as f:
    chunks = pickle.load(f)

model = SentenceTransformer(MODEL_NAME)


def retrieve_knowledge(query, top_k=3):
    query_embedding = model.encode(
        [query],
        convert_to_numpy=True
    )

    distances, indices = index.search(
        query_embedding,
        top_k
    )

    results = []

    for distance, index_id in zip(distances[0], indices[0]):
        results.append({
            "text": chunks[index_id],
            "distance": float(distance)
        })

    return results


if __name__ == "__main__":
    query = "What should a SOC analyst investigate for a suspicious network flow?"

    results = retrieve_knowledge(query, top_k=3)

    print("\nRAG RETRIEVAL TEST")
    print("=" * 60)

    for i, result in enumerate(results, 1):
        print(f"\nResult {i}")
        print("-" * 60)
        print(result["text"])
        print(f"Distance: {result['distance']:.4f}")