import os
import torch
from dspy import RAG, Signature, InputField, OutputField
from dspy.retrieve.qdrant_rm import QdrantRM
from qdrant_client import QdrantClient
from transformers import AutoTokenizer, AutoModel

# Initialize the Qdrant client
client = QdrantClient(host='localhost', port=6333)

# Load the MiniLM model and tokenizer
tokenizer = AutoTokenizer.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")
model = AutoModel.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")

def encode_text(text):
    """Encodes text using the MiniLM model."""
    with torch.no_grad():
        inputs = tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=128)
        outputs = model(**inputs)
        return outputs.last_hidden_state[:, 0, :].numpy()

class Question(Signature):
    text = InputField()

class Answer(Signature):
    content = OutputField()

# Configure DSPy RAG
rag = RAG(
    retriever=QdrantRM(
        qdrant_client=client,
        qdrant_collection_name="LFGCollect",
        vector_encoder=encode_text
    ),
    generator=None,  # Assuming direct use of retrieved content for simplicity
    input_signature=Question,
    output_signature=Answer
)

def process_question(question_text):
    """Processes a question and returns a generated answer."""
    result = rag(Question(text=question_text))
    if not result:
        return "No relevant information found."
    return " ".join([f"Found topic: {doc['title']}" for doc in result])

# Example usage
question = "who is bezos?"
answer = process_question(question)
print(answer)
