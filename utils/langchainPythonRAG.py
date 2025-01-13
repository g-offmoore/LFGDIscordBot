import os
import sys
import json
import logging
import regex as re
import nltk
import spacy
from nltk.tokenize import word_tokenize, sent_tokenize
from nltk.corpus import stopwords

# Ensure NLTK data is downloaded
nltk.download('punkt', quiet=True)
nltk.download('punkt_tab', quiet=True)
nltk.download('averaged_perceptron_tagger', quiet=True)
nltk.download('stopwords', quiet=True)
nltk.download('wordnet', quiet=True)

from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.http import models

# Configure logging
logging.basicConfig(level=logging.ERROR, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger()

# Initialize spaCy model
nlp = spacy.load('en_core_web_sm')

client = QdrantClient(url='http://192.168.1.249:6333')

def load_model():
    model_path = 'models/sentence-transformer/all-mpnet-base-v2'
    encoder = SentenceTransformer(model_path)
    return encoder

def normalize_text(text):
    # Remove URLs
    text = re.sub(r'https?://\S+|www\.\S+', '', text)
    # Remove emojis and other unicode symbols
    text = re.sub(r'\p{So}', '', text)
    # Remove special characters except punctuation
    text = re.sub(r'[^\w\s.,;:?!-]', '', text)
    # Replace multiple whitespaces with a single space
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def preserve_case_tokenization(text):
    sentences = sent_tokenize(text)
    normalized_sentences = []
    for sentence in sentences:
        words = nltk.word_tokenize(sentence)
        tagged_words = nltk.pos_tag(words)
        normalized_words = [
            word if tag in ('NNP', 'NNPS') else word.lower()
            for word, tag in tagged_words
        ]
        normalized_sentences.append(' '.join(normalized_words))
    return ' '.join(normalized_sentences)

def extract_entities(text):
    doc = nlp(text)
    entities = [ent.text for ent in doc.ents]
    return entities

def search(question, model):
    # Preprocess the question
    question = normalize_text(question)
    question = preserve_case_tokenization(question)
    query_embedding = model.encode(question).tolist()
    # Extract entities from the question
    entities = extract_entities(question)
    if entities:
        must_conditions = [
            models.FieldCondition(
                key="entities",
                match=models.MatchAny(any=entities)
            )
        ]
    else:
        must_conditions = []

    hits = client.search(
        collection_name="LFGCollect",
        query_vector=query_embedding,
        limit=10,  # Adjust as needed
        query_filter=models.Filter(must=must_conditions) if must_conditions else None,
    )

    # Optionally filter by similarity threshold
    similarity_threshold = 0.02  # Adjust based on experimentation
    filtered_hits = [hit for hit in hits if hit.score > similarity_threshold]

    # **Add this check for empty results**
    if not filtered_hits:
        # Return 'no lore found' if there are no results
        return json.dumps([{"text": "no lore found nothing similar"}])

    results = []
    for hit in filtered_hits:
        logger.info(f"\n\nSimilarity score:{hit.score}\n")
        text = hit.payload.get('text')
        if text:
            results.append({"text": text})
        else:
            logger.error(f"No text found for hit {hit.id}\nSimilarity score: {hit.score}") 
            pass   
    return json.dumps(results)



if __name__ == "__main__":
    if len(sys.argv) < 2:
        logger.error("No query provided. Usage: python script.py '<query>'")
        sys.exit(1)

    query = sys.argv[1]
    model = load_model()
    results = search(query, model)

    print(results)
