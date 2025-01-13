#!/usr/bin/env python3

import os
import sys
import json
import logging
import numpy as np
import regex as re
import uuid
from multiprocessing import Pool
from functools import partial

# Text processing libraries
import nltk
import spacy
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize, sent_tokenize

# Ensure NLTK data is downloaded
nltk.download('punkt')
nltk.download('averaged_perceptron_tagger')
nltk.download('stopwords')
nltk.download('wordnet')

from nltk.stem import WordNetLemmatizer

# Sentence Transformer for embeddings
from sentence_transformers import SentenceTransformer

# Qdrant client for vector database
from qdrant_client import QdrantClient, models
from qdrant_client.http.models import PointStruct

# Configure logging
logging.basicConfig(filename='text_processing.log', level=logging.DEBUG,
                    format='%(asctime)s:%(levelname)s:%(message)s')
logger = logging.getLogger()

# Initialize spaCy model
nlp = spacy.load('en_core_web_sm')

# Constants and configuration
QDRANT_HOST = "192.168.1.249"
QDRANT_PORT = int(os.environ.get("QDRANT_PORT", 6333))
COLLECTION_NAME = "LFGCollect"
INPUT_DIRECTORY = r'C:\Users\G_off\Documents\Coding\LFGBot knowledge\Ingest'
BATCH_SIZE = 16  # Adjust based on your system's memory capacity

# Initialize the Qdrant client
qdrant = QdrantClient(f"http://{QDRANT_HOST}:{QDRANT_PORT}")

# Initialize Sentence Transformer Model
# Consider using a more powerful model if resources allow
model = SentenceTransformer("all-mpnet-base-v2")

# Initialize lemmatizer
lemmatizer = WordNetLemmatizer()

def generate_uuid():
    return str(uuid.uuid4())

# Check if collection exists, create if not
def ensure_collection_exists():
    existing_collections = [col.name for col in qdrant.get_collections().collections]
    if COLLECTION_NAME not in existing_collections:
        qdrant.recreate_collection(
            collection_name=COLLECTION_NAME,
            vectors_config={
                "size": model.get_sentence_embedding_dimension(),
                "distance": "Cosine"
            }
        )
        logger.info(f"Created collection '{COLLECTION_NAME}' in Qdrant.")

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
    # Tokenize sentences
    sentences = sent_tokenize(text)
    normalized_sentences = []
    for sentence in sentences:
        # Tokenize words and POS tagging
        words = nltk.word_tokenize(sentence)
        tagged_words = nltk.pos_tag(words)
        # Preserve proper nouns (NNP, NNPS), lowercase others
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

def split_text(text):
    # Split text into sections based on headings
    sections = re.split(r'\n(?=[A-Z][\w\s]+)', text)
    chunks = []
    for section in sections:
        section = section.strip()
        if not section:
            continue
        # Extract current title or heading
        title_match = re.match(r'^([A-Z][\w\s]+)', section)
        current_title = title_match.group(1) if title_match else None
        # Further split section into sentences
        sentences = sent_tokenize(section)
        # Combine sentences into chunks
        chunk_size = 500  # Adjust as needed
        overlap = 50
        for i in range(0, len(sentences), chunk_size - overlap):
            chunk_sentences = sentences[i:i + chunk_size]
            chunk_text = ' '.join(chunk_sentences)
            chunks.append({'text': chunk_text, 'title': current_title})
    return chunks

def embed_text_chunks(text_chunks):
    embeddings = []
    texts = []
    for i in range(0, len(text_chunks), BATCH_SIZE):
        batch = text_chunks[i:i + BATCH_SIZE]
        batch_texts = [item['text'] for item in batch]
        try:
            batch_embeddings = model.encode(batch_texts, show_progress_bar=True, convert_to_numpy=True)
            embeddings.extend(batch_embeddings)
            texts.extend(batch)
        except Exception as e:
            logger.error(f"Error during model encoding: {str(e)}")
            # Handle partially completed batches
            continue
    return embeddings, texts

def upload_embeddings_with_texts(embeddings, texts):
    batch_size = 100  # Adjust based on your system's capacity
    for i in range(0, len(embeddings), batch_size):
        batch_embeddings = embeddings[i:i + batch_size]
        batch_texts = texts[i:i + batch_size]
        points = []
        for embed, item in zip(batch_embeddings, batch_texts):
            # Extract entities for metadata
            entities = extract_entities(item['text'])
            point = PointStruct(
                id=generate_uuid(),
                vector=embed.tolist(),
                payload={
                    "text": item['text'],
                    "title": item['title'],
                    "entities": entities
                }
            )
            points.append(point)
        try:
            response = qdrant.upsert(collection_name=COLLECTION_NAME, points=points)
            if response.status != 'ok':
                logger.error(f"Failed to upload points: {response}")
        except Exception as e:
            logger.error(f"Error uploading points to Qdrant: {str(e)}")

def process_directory(input_dir):
    all_chunks = []
    print(f"Processing input directory: {INPUT_DIRECTORY}")
    for file_name in os.listdir(input_dir):
        file_path = os.path.join(input_dir, file_name)
        if os.path.isfile(file_path):
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    text = f.read()
                # Normalize the text
                text = normalize_text(text)
                # Preserve proper nouns
                text = preserve_case_tokenization(text)
                # Split the document into chunks
                chunks = split_text(text)
                all_chunks.extend(chunks)
                logger.info(f"Processed file '{file_name}' with {len(chunks)} chunks.")
            except Exception as e:
                logger.error(f"Failed to read or process file '{file_name}': {str(e)}")
    # Embed all chunks
    embeddings, texts = embed_text_chunks(all_chunks)
    # Upload embeddings to Qdrant
    upload_embeddings_with_texts(embeddings, texts)
    logger.info("Completed processing and uploading embeddings.")

if __name__ == "__main__":
    try:
        ensure_collection_exists()
        
        process_directory(INPUT_DIRECTORY)
    except Exception as e:
        logger.critical(f"An unexpected error occurred: {str(e)}")
        sys.exit(1)