import os
import json
import numpy as np
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient, models
import uuid
from qdrant_client.http.models import PointStruct
from langchain_text_splitters import RecursiveCharacterTextSplitter
import regex as re
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
import logging

logging.basicConfig(filename='text_processing.log', level=logging.INFO,
                    format='%(asctime)s:%(levelname)s:%(message)s')

def generate_uuid():
    return str(uuid.uuid4())

qdrant_host = os.environ.get("QDRANT_HOST")
qdrant_port = int(os.environ.get("QDRANT_PORT", 6333))
collection_name = "LFGCollect"

# Initialize the Qdrant client
qdrant = QdrantClient("http://45.79.213.234:6333")

# Initialize Sentence Transformer Model
model = SentenceTransformer("all-MiniLM-L6-v2")

# Initialize Langchain's Recursive Character Splitter
splitter = RecursiveCharacterTextSplitter(    
    chunk_size=700,
    chunk_overlap=50,
    length_function=len,
)

# Check if collection exists, create if not
existing_collections = [col.name for col in qdrant.get_collections().collections]
if collection_name not in existing_collections:
    qdrant.create_collection(
        collection_name=collection_name,
        vectors_config={            
                "size": model.get_sentence_embedding_dimension(),
                "distance": "Dot"
        }
    )

def embed_text_chunks(text_chunks):
    batch_size = 16  # Define batch size based on your memory capacity and model specifics
    embeddings = []
    for i in range(0, len(text_chunks), batch_size):
        batch = text_chunks[i:i + batch_size]
        try:
            batch_embeddings = model.encode(batch, show_progress_bar=True, convert_to_numpy=True)
            embeddings.extend(batch_embeddings)
        except Exception as e:
            logging.error(f"Error during model encoding: {str(e)}")
            # Handle partially completed batches
            embeddings.extend([np.zeros(model.get_sentence_embedding_dimension())] * len(batch))
    return embeddings

def upload_embeddings_with_texts(qdrant, collection_name, embeddings, texts):
    points = [PointStruct(id=generate_uuid(), vector=embed.tolist(), payload={"text": text})
              for embed, text in zip(embeddings, texts)]
    qdrant.upsert(collection_name=collection_name, points=points)

def normalize_text(text, remove_numbers=True, domain_stopwords=set()):
    # Convert text to lowercase
    text = text.lower()
    # Remove URLs
    text = re.sub(r'https?://\S+|www\.\S+', '', text)
    # Remove Emojis and other unicode characters
    text = re.sub(r'\p{So}', '', text)
    # Remove punctuation and special characters
    text = re.sub(r'[^\w\s]', '', text)
    return text

def process_directory(input_dir):
    for file_name in os.listdir(input_dir):
        file_path = os.path.join(input_dir, file_name)
        if os.path.isfile(file_path):
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    text = f.read()
                # Normalize the text
                normalized_text = normalize_text(text)
                # Split the document using Langchain's splitter
                text_chunks = splitter.split_text(normalized_text)
                # Embed each chunk separately
                for chunk in text_chunks:
                    try:
                        embeddings = embed_text_chunks([chunk])
                        upload_embeddings_with_texts(qdrant, collection_name, embeddings, [chunk])
                    except Exception as e:
                        logging.error(f"Failed to embed text chunk {chunk}: {str(e)}")
            except Exception as e:
                logging.error(f"Failed to read or process file {file_name}: {str(e)}")

if __name__ == "__main__":
    input_directory = 'C:\\Users\\G_off\\Documents\\LFGBot knowledge\\Ingest'
    output_directory = 'C:\\Users\\G_off\\Documents\\LFGBot knowledge\\Ingest\\processed'
    
    # Example call to process_directory_with_recursive_splitter
    process_directory(input_directory)


# import os
# import json
# import numpy as np
# from sentence_transformers import SentenceTransformer
# from qdrant_client import QdrantClient, models
# import uuid
# from qdrant_client.http.models import PointStruct
# from langchain_text_splitters import RecursiveCharacterTextSplitter
# import regex as re
# from nltk.corpus import stopwords
# from nltk.tokenize import word_tokenize
# import logging

# logging.basicConfig(filename='text_processing.log', level=logging.INFO,
#                     format='%(asctime)s:%(levelname)s:%(message)s')

# def generate_uuid():
#     return str(uuid.uuid4())

# qdrant_host = os.environ.get("QDRANT_HOST")
# qdrant_port = int(os.environ.get("QDRANT_PORT", 6333))
# collection_name = "LFGCollect"

# # Initialize the Qdrant client
# qdrant = QdrantClient("http://45.79.213.234:6333")

# # Initialize Sentence Transformer Model
# model = SentenceTransformer("all-MiniLM-L6-v2")

# # Initialize Langchain's Recursive Character Splitter
# splitter = RecursiveCharacterTextSplitter(    
#     chunk_size=700,
#     chunk_overlap=50,
#     length_function=len,
#     )

# # Check if collection exists, create if not
# existing_collections = [col.name for col in qdrant.get_collections().collections]
# if collection_name not in existing_collections:
#     qdrant.create_collection(
#         collection_name=collection_name,
#         vectors_config={            
#                 "size": model.get_sentence_embedding_dimension(),
#                 "distance": "dot-product"
#         }
#     )

# # def embed_text_chunks(text_chunks):
# #     embeddings = model.encode(text_chunks, show_progress_bar=True, convert_to_numpy=True)
# #     return embeddings
# def embed_text_chunks(text_chunks):
#     batch_size = 16  # Define batch size based on your memory capacity and model specifics
#     embeddings = []
#     for i in range(0, len(text_chunks), batch_size):
#         batch = text_chunks[i:i + batch_size]
#         try:
#             batch_embeddings = model.encode(batch, show_progress_bar=True, convert_to_numpy=True)
#             embeddings.extend(batch_embeddings)
#         except Exception as e:
#             logging.error(f"Error during model encoding: {str(e)}")
#             # Handle partially completed batches
#             embeddings.extend([np.zeros(model.get_sentence_embedding_dimension())] * len(batch))
#     return embeddings

# def upload_embeddings_with_texts(qdrant, collection_name, embeddings, texts):
#     points = [PointStruct(id=generate_uuid(), vector=embed.tolist(), payload={"text": text})
#               for embed, text in zip(embeddings, texts)]
#     qdrant.upsert(collection_name=collection_name, points=points)

# def process_directory(input_dir):
#     for file_name in os.listdir(input_dir):
#         file_path = os.path.join(input_dir, file_name)
#         if os.path.isfile(file_path):
#             with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
#                 text = f.read()
#             # Split the document using Langchain's splitter
#             text_chunks = splitter.split_text(text)
#             # Embed each chunk separately
#             for chunk in text_chunks:
#                 embeddings = embed_text_chunks([chunk])
#                 upload_embeddings_with_texts(qdrant, collection_name, embeddings, [chunk])

# def normalize_text(text, remove_numbers=True, domain_stopwords=set()):
#     # Convert text to lowercase
#     text = text.lower()
#     # Remove URLs
#     text = re.sub(r'https?://\S+|www\.\S+', '', text)
#     # Remove Emojis and other unicode characters
#     text = re.sub(r'\p{So}', '', text)
#     # Remove punctuation and special characters
#     text = re.sub(r'[^\w\s]', '', text)
#     # Remove numbers
#     if remove_numbers:
#         text = re.sub(r'\d+', '', text)
#     # Remove stopwords
#     stop_words = set(stopwords.words('english')) | domain_stopwords
#     word_tokens = word_tokenize(text)
#     text = ' '.join([word for word in word_tokens if word not in stop_words])
#     return text

# def process_directory(input_dir):
#     for file_name in os.listdir(input_dir):
#         file_path = os.path.join(input_dir, file_name)
#         if os.path.isfile(file_path):
#             try:
#                 with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
#                     text = f.read()
#                 # Normalize the text
#                 normalized_text = normalize_text(text)
#                 # Split the document using Langchain's splitter
#                 text_chunks = splitter.split_text(normalized_text)
#                 # Embed each chunk separately
#                 for chunk in text_chunks:
#                     try:
#                         embeddings = embed_text_chunks([chunk])
#                         upload_embeddings_with_texts(qdrant, collection_name, embeddings, [chunk])
#                     except Exception as e:
#                         logging.error(f"Failed to embed text chunk {chunk}: {str(e)}")
#             except Exception as e:
#                 logging.error(f"Failed to read or process file {file_name}: {str(e)}")

# if __name__ == "__main__":
#     input_directory = 'C:\\Users\\G_off\\Documents\\LFGBot knowledge\\Ingest'
#     output_directory = 'C:\\Users\\G_off\\Documents\\LFGBot knowledge\\Ingest\\processed'
    
#     # Example call to process_directory_with_recursive_splitter
#     process_directory(input_directory)

