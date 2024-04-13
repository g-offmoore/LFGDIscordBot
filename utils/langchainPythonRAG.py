import os
import sys
import json
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient

# Initialize Qdrant client with environment variables
qdrant_host = os.environ.get("QDRANT_HOST")
qdrant_port = int(os.environ.get("QDRANT_PORT", 6333))  # Default port if not provided
collection_name = "LFGCollect"

# Initialize the Sentence Transformer model
model = SentenceTransformer("all-MiniLM-L6-v2")

# Initialize Qdrant client
qdrant_client = QdrantClient(host=qdrant_host, port=qdrant_port)

def semantic_search(query: str, limit: int = 5):
    try: 
        query_embedding = model.encode([query], show_progress_bar=False)[0]
        search_results = qdrant_client.search(
            collection_name=collection_name,
            query_vector=query_embedding.tolist(),
            limit=limit,
            score_threshold=0.0,  # Adjust based on your needs
        )
        return search_results
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return []

def format_result(scored_point):
    payload = scored_point.payload
    score = scored_point.score
    if 'text' in payload and isinstance(payload['text'], str):
        formatted_text = payload['text']  # Truncate to first 200 characters if necessary
    else:
        formatted_text = "Invalid payload structure or type"
    formatted = f"Tome: {formatted_text})"
    return formatted

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 langchainPythonRAG.py '<query>'", file=sys.stderr)
        sys.exit(1)
    
    query = sys.argv[1]
    results = semantic_search(query)
    # Log the raw results to stderr for debugging
    # print(f"Raw search results: {results}", file=sys.stderr)
    
    formatted_results = [format_result(point) for point in results]
    # Output the final results as JSON to stdout
    print(json.dumps(formatted_results))
