import json
import os
import boto3
import PyPDF2
from io import BytesIO
from opensearchpy import OpenSearch, RequestsHttpConnection, AWSV4SignerAuth

s3 = boto3.client('s3')
bedrock_region = os.environ.get('BEDROCK_REGION', os.environ.get('AWS_REGION', 'ap-south-1'))
bedrock = boto3.client('bedrock-runtime', region_name=bedrock_region)

host = os.environ.get('OPENSEARCH_ENDPOINT')
if host and host.startswith('https://'):
    host = host.replace('https://', '')
region = os.environ.get('AWS_REGION', 'us-east-1')
credentials = boto3.Session().get_credentials()
auth = AWSV4SignerAuth(credentials, region, 'aoss')

os_client = OpenSearch(
    hosts = [{'host': host, 'port': 443}],
    http_auth = auth,
    use_ssl = True,
    verify_certs = True,
    connection_class = RequestsHttpConnection,
    pool_maxsize = 20
)

INDEX_NAME = 'documents-index'
EMBEDDING_MODEL_ID = os.environ.get('EMBEDDING_MODEL_ID', 'amazon.titan-embed-text-v2:0')
EMBEDDING_DIMENSION = int(os.environ.get('EMBEDDING_DIMENSION', '1024'))

def chunk_text(text, chunk_size=1000, overlap=100):
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap
    return chunks

def get_embedding(text):
    response = bedrock.invoke_model(
        body=json.dumps({"inputText": text}),
        modelId=EMBEDDING_MODEL_ID,
        accept="application/json",
        contentType="application/json"
    )
    result = json.loads(response['body'].read())
    return result['embedding']

def lambda_handler(event, context):
    try:
        # Ensure index exists with the expected embedding dimension.
        recreate_index = False
        if os_client.indices.exists(index=INDEX_NAME):
            mapping = os_client.indices.get_mapping(index=INDEX_NAME)
            current_dimension = (
                mapping.get(INDEX_NAME, {})
                .get("mappings", {})
                .get("properties", {})
                .get("embedding", {})
                .get("dimension")
            )
            if current_dimension and int(current_dimension) != EMBEDDING_DIMENSION:
                recreate_index = True
        if recreate_index:
            os_client.indices.delete(index=INDEX_NAME)

        if not os_client.indices.exists(index=INDEX_NAME):
            os_client.indices.create(index=INDEX_NAME, body={
                "settings": {
                    "index": {
                        "knn": True,
                        "knn.algo_param.ef_search": 100
                    }
                },
                "mappings": {
                    "properties": {
                        "embedding": {
                            "type": "knn_vector",
                            "dimension": EMBEDDING_DIMENSION,
                            "method": {
                                "name": "hnsw",
                                "engine": "nmslib",
                                "space_type": "l2"
                            }
                        },
                        "text": {"type": "text"},
                        "source": {"type": "keyword"},
                        "chunk_index": {"type": "integer"}
                    }
                }
            })
            
        for record in event['Records']:
            bucket = record['s3']['bucket']['name']
            key = record['s3']['object']['key']
            
            response = s3.get_object(Bucket=bucket, Key=key)
            pdf_bytes = response['Body'].read()
            
            reader = PyPDF2.PdfReader(BytesIO(pdf_bytes))
            text = ""
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
                
            chunks = chunk_text(text)
            
            for i, chunk in enumerate(chunks):
                if not chunk.strip(): continue
                embedding = get_embedding(chunk)
                
                doc = {
                    "text": chunk,
                    "embedding": embedding,
                    "source": key,
                    "chunk_index": i
                }
                os_client.index(index=INDEX_NAME, body=doc)
                
        return {"statusCode": 200, "body": "Success"}
    except Exception as e:
        print(f"Error: {e}")
        return {"statusCode": 500, "body": str(e)}
