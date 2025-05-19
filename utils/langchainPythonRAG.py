import os
import sys
import json
import logging
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient

# Configure logging
logging.basicConfig(level=logging.ERROR, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger()

client = QdrantClient(url='http://192.168.1.249:6333')

def load_model():
    model_path = 'models/sentence-transformer/all-MiniLM-L6-v2'
    if not os.path.exists(model_path):
        encoder = SentenceTransformer('all-MiniLM-L6-v2')
        encoder.save(model_path)
    else:
        encoder = SentenceTransformer(model_path)
    return encoder

def search(question, model):
    hits = client.search(
        collection_name="LFGCollect",
        query_vector=model.encode(question).tolist(),
        limit=5,
    )
    results = []
    for hit in hits:
        result = {"text": hit.payload.get('text', 'No text provided'), "score": hit.score}
        results.append(result)
    return json.dumps(results)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        logger.error("No query provided. Usage: python script.py '<query>'")
        sys.exit(1)

    query = sys.argv[1]
    model = load_model()
    results = search(query, model)
    
    print(results)
