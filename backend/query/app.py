import json
import os
import boto3
from opensearchpy import OpenSearch, RequestsHttpConnection, AWSV4SignerAuth

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
CHAT_MODEL_ID = os.environ.get('CHAT_MODEL_ID', 'arn:aws:bedrock:ap-south-1:686348673799:inference-profile/apac.amazon.nova-micro-v1:0')

def get_embedding(text):
    response = bedrock.invoke_model(
        body=json.dumps({"inputText": text}),
        modelId=EMBEDDING_MODEL_ID,
        accept="application/json",
        contentType="application/json"
    )
    result = json.loads(response['body'].read())
    return result['embedding']



def generate_answer(query, contexts):
    context_str = "\n\n".join(contexts)

    prompt = f"""
You are an AI Research Assistant.
Answer the question based on the context below.
If the answer is not in the context, say "I don't know".

Context:
{context_str}

Question:
{query}
"""

    print("USING NOVA MODEL ✅")
    print("MODEL USED:", CHAT_MODEL_ID)

    response = bedrock.invoke_model(
        modelId=CHAT_MODEL_ID,
        body=json.dumps({
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "text": prompt
                        }
                    ]
                }
            ]
        }),
        accept="application/json",
        contentType="application/json"
    )

    result = json.loads(response["body"].read())

    return result["output"]["message"]["content"][0]["text"]

def lambda_handler(event, context):
    try:
        print("Lambda event:", json.dumps(event))
        path = event.get('rawPath', event.get('path', ''))
        print("Resolved path:", path)
        body = json.loads(event.get('body', '{}'))
        
        if path == '/upload-url':
            filename = body.get('filename')
            if not filename:
                return {
                    "statusCode": 400,
                    "headers": {"Access-Control-Allow-Origin": "*"},
                    "body": json.dumps({"error": "Missing filename"})
                }
            s3_client = boto3.client('s3')
            url = s3_client.generate_presigned_url(
                ClientMethod='put_object',
                Params={
                    'Bucket': os.environ.get('DOCUMENTS_BUCKET_NAME'),
                    'Key': filename,
                    'ContentType': body.get('contentType', 'application/pdf')
                },
                ExpiresIn=3600
            )
            return {
                "statusCode": 200,
                "headers": {"Access-Control-Allow-Origin": "*"},
                "body": json.dumps({"url": url})
            }
            
        query = body.get('query')
        if not query:
            return {
                "statusCode": 400, 
                "headers": {"Access-Control-Allow-Origin": "*"}, 
                "body": json.dumps({"error": "Missing query"})
            }
            
        embedding = get_embedding(query)
        
        search_query = {
            "size": 3,
            "query": {
                "knn": {
                    "embedding": {
                        "vector": embedding,
                        "k": 3
                    }
                }
            }
        }
        
        response = os_client.search(index=INDEX_NAME, body=search_query)
        hits = response['hits']['hits']
        contexts = [hit['_source']['text'] for hit in hits]
        sources = list(set([hit['_source']['source'] for hit in hits]))
        
        answer = generate_answer(query, contexts)
        
        return {
            "statusCode": 200,
            "headers": {"Access-Control-Allow-Origin": "*"},
            "body": json.dumps({
                "answer": answer,
                "sources": sources,
                "contexts": contexts
            })
        }
    except Exception as e:
        print(f"Error: {e}")
        return {
            "statusCode": 500,
            "headers": {"Access-Control-Allow-Origin": "*"},
            "body": json.dumps({"error": str(e)})
        }
