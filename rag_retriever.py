import re

KNOWLEDGE_PATH = "knowledge_base/security_knowledge.txt"


def load_knowledge():
    with open(KNOWLEDGE_PATH, "r", encoding="utf-8") as f:
        text = f.read()

    chunks = [
        chunk.strip()
        for chunk in re.split(r"\n\s*\n", text)
        if chunk.strip()
    ]

    return chunks


chunks = load_knowledge()


def retrieve_knowledge(query, top_k=3):
    query_terms = set(
        re.findall(r"\b[a-zA-Z0-9_-]+\b", query.lower())
    )

    scored = []

    for chunk in chunks:
        chunk_terms = set(
            re.findall(r"\b[a-zA-Z0-9_-]+\b", chunk.lower())
        )

        score = len(query_terms.intersection(chunk_terms))

        scored.append({
            "text": chunk,
            "distance": float(-score)
        })

    scored.sort(key=lambda item: item["distance"])

    return scored[:top_k]


if __name__ == "__main__":
    results = retrieve_knowledge(
        "suspicious network flow investigation",
        top_k=3
    )

    print("\nRAG RETRIEVAL TEST")
    print("=" * 60)

    for i, result in enumerate(results, 1):
        print(f"\nResult {i}")
        print("-" * 60)
        print(result["text"])
        print(f"Score: {-result['distance']}")
