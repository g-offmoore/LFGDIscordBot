import os
from typing import List

import numpy as np
import torch
from dspy import RAG, Signature, InputField, OutputField
from dspy.retrieve.qdrant_rm import QdrantRM
from qdrant_client import QdrantClient
from transformers import AutoModel, AutoTokenizer

# ─── Configuration ────────────────────────────────────────────────────────────
QDRANT_HOST       = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT       = int(os.getenv("QDRANT_PORT", 6333))
COLLECTION_NAME   = "LFGCollect"
MODEL_NAME        = "sentence-transformers/all-MiniLM-L6-v2"
MAX_LENGTH        = 128

# ─── Initialization ───────────────────────────────────────────────────────────
qdrant_client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model     = AutoModel.from_pretrained(MODEL_NAME)
model.eval()

# ─── Helper Functions ─────────────────────────────────────────────────────────
def encode_text(text: str) -> np.ndarray:
    """Encode text into embeddings using the MiniLM model."""
    inputs = tokenizer(
        text, 
        return_tensors="pt", 
        padding=True, 
        truncation=True, 
        max_length=MAX_LENGTH
    )
    with torch.no_grad():
        outputs = model(**inputs)
    # Use the [CLS] token embedding
    return outputs.last_hidden_state[:, 0, :].cpu().numpy()

# ─── DSPy Signature Definitions ───────────────────────────────────────────────
class Question(Signature):
    """Input signature for RAG queries."""
    text = InputField()

class Answer(Signature):
    """Output signature for RAG responses."""
    content = OutputField()

# ─── Configure RAG ────────────────────────────────────────────────────────────
rag = RAG(
    retriever=QdrantRM(
        qdrant_client=qdrant_client,
        qdrant_collection_name=COLLECTION_NAME,
        vector_encoder=encode_text,
    ),
    generator=None,  # Directly return retrieved content
    input_signature=Question,
    output_signature=Answer,
)

# ─── Core Functionality ───────────────────────────────────────────────────────
def process_question(question_text: str) -> str:
    """Query the RAG system and format the results."""
    documents = rag(Question(text=question_text))
    if not documents:
        return "No relevant information found."
    return " ".join(f"Found topic: {doc['title']}" for doc in documents)

# ─── Example Usage ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    sample = "Who is Bezos?"
    answer = process_question(sample)
    print(answer)
