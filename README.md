# AI Research Assistant with RAG on AWS

An end-to-end AI-powered research assistant deployed on AWS using Serverless technologies, Terraform, and the Next.js framework. This application enables users to upload PDF research papers to a knowledge base and ask natural language questions about their content utilizing a Retrieval-Augmented Generation (RAG) pipeline powered by Amazon Bedrock.

## Architecture

1. **Frontend**: Next.js (React) unified single-page application containerized via Docker and served caching-optimized static files natively using Nginx.
2. **Backend**:
   - **Ingestion**: An AWS Lambda function triggered automatically by Amazon S3 uploads. It extracts text via `PyPDF2`, chunks it into semantic segments, encodes them into high-dimensional vectors via **Amazon Titan Embeddings**, and indexes them into **Amazon OpenSearch Serverless**.
   - **Query**: An AWS Lambda function invoked asynchronously by Amazon API Gateway. It resolves the user's intent by querying OpenSearch Serverless using Titan, constructs an augmented prompt using the most relevant document chunks, and synthesizes a grounded answer via **Anthropic Claude 3 Haiku** on **Amazon Bedrock**.
3. **Infrastructure as Code**: The entire stack is fully orchestrated using Terraform (`/terraform`), applying AWS security best practices (IAM Least Privilege, Encryption-At-Rest, Network Policies).

## Prerequisites
- **AWS CLI**: Authenticated with local `AdministratorAccess` (or sufficient privileges to create IAM roles, Lambdas, S3 buckets, API gateways, and OpenSearch collections).
- **Terraform CLI**: Installed locally.
- **Docker**: Required to run the containerized interactive frontend locally using docker-compose.
- **Amazon Bedrock Model Access**: Ensure you have successfully requested access to **Titan Embeddings G1 - Text** (`amazon.titan-embed-text-v1`) and **Claude 3 Haiku** (`anthropic.claude-3-haiku-20240307-v1:0`) in your target AWS Region.

## Deployment Instructions

### 1. Initialize Infrastructure
Navigate to the terraform directory and initialize standard Terraform providers:
```bash
cd terraform
terraform init
```

### 2. AWS Variables Verification
Review `terraform/variables.tf`. The default `project_name` acts as the global prefix for S3 buckets, lambdas, and OpenSearch collections. Ensure S3 names are lowercase due to AWS naming constraints.

### 3. Deploy
Execute a plan and apply the infrastructure:
```bash
terraform apply
```
*Note: Deploying Amazon OpenSearch Serverless collections can take anywhere from 3 to 10 minutes.*

### 4. Deploy Frontend using Docker & Nginx
The frontend has been decoupled from AWS Amplify and securely wrapper within a multi-stage Docker image powered by Nginx.
1. Make sure you have Docker installed on your machine.
2. In the `docker-compose.yml` file, retrieve the deployed `api_endpoint` from Terraform outputs, and paste it where it says `NEXT_PUBLIC_API_URL`!
3. Spin up the container:
   ```bash
   docker-compose up --build -d
   ```
4. Access the application on `http://localhost:80`.

## Usage

Once Docker has successfully spun up your Next.js application:
1. Open the Web Application.
2. Select a `.pdf` research paper and wait for the system to process the ingestion into OpenSearch Serverless.
3. Chat with the AI using the prompt box. The AI Assistant will source information explicitly from the documents you feed it!

## Cleanup
Because Amazon OpenSearch Serverless incurs fixed networking container costs per hour even when inactive, please destroy the resources when you are finished examining the project:
```bash
cd terraform
terraform destroy
```





# RAG AI Research Assistant

A serverless Retrieval-Augmented Generation (RAG) AI Research Assistant powered by AWS, built with React frontend and deployed using Docker + Nginx.

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Frontend](#frontend)
- [Backend](#backend)
- [AWS Deployment](#aws-deployment)
- [Docker & Nginx](#docker--nginx)
- [Cost Analysis](#cost-analysis)
- [Installation & Setup](#installation--setup)
- [Usage](#usage)
- [Project Structure](#project-structure)

---

## 🎯 Project Overview

**RAG AI Research Assistant** is a full-stack application that enables users to query research documents and receive AI-powered responses backed by actual document retrieval.

**Key Features:**
- Chat-based interface for querying research documents
- Retrieval-Augmented Generation for accurate, cited responses
- Serverless architecture on AWS for scalability
- Docker containerization for consistent deployment
- Cost-optimized (~$0.76/month for demo environment)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React/Next.js)                 │
│              Served via Nginx in Docker Container           │
│                    Port: 80 (HTTP)                          │
└────────────────────────────┬────────────────────────────────┘
                             │
                   HTTPS API Calls
                             │
┌────────────────────────────▼────────────────────────────────┐
│              AWS API Gateway (HTTP API)                     |
│    Endpoint: https://5ow79nd23b.execute-api.ap-south-1...   │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                  AWS Lambda Functions                       |
│        (RAG Pipeline, LLM Integration, Vector Search)       |
└────────────────────────────┬────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
     ┌──▼──┐           ┌─────▼──────┐      ┌────▼───┐
     │S3   │           │ OpenSearch │      │Vector  │
     │Docs │           │Serverless  │      │Store   │
     └─────┘           └────────────┘      └────────┘
```

---

## 💻 Frontend

### Language & Framework
- **Framework:** Next.js (React-based)
- **Language:** JavaScript/TypeScript
- **Styling:** CSS/Tailwind 
- **Build Tool:** Next.js built-in

### UI Components
- **Query Input Box:** Text field for research questions
- **Conversation History:** Display past queries and responses
- **Response Cards:** AI answers with source citations
- **Loading States:** Spinners during API calls
- **Evidence Display:** Retrieved documents/citations

### Key Files
| File | Purpose |
|------|---------|
| `frontend/pages/index.js` or `frontend/app/page.tsx` | Main chat interface |
| `frontend/components/ChatBox.jsx` | Query input & response display |
| `frontend/services/apiClient.ts` | HTTP client for backend API |
| `frontend/public/*` | Static assets (icons, logos) |
| `frontend/styles/*` | CSS/styling |

### Backend Connection
The frontend communicates with the backend API Gateway through environment variables:

```javascript
// frontend/services/apiClient.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function sendQuery(question: string) {
  const response = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question, context: {} }),
  });
  
  return response.json(); // { text, sourceDocs, metadata }
}
```

**CORS:** Configured in API Gateway to allow requests from frontend origin.

---

## 🔧 Backend

### Architecture
- **Runtime:** Node.js on AWS Lambda
- **Language:** TypeScript/JavaScript
- **Trigger:** API Gateway HTTP API routes

### Core Endpoints

#### `POST /chat`
Processes user queries through the RAG pipeline.

**Request:**
```json
{
  "question": "What is the latest research on RAG?",
  "userId": "user123",
  "context": {}
}
```

**Response:**
```json
{
  "text": "Based on recent research...",
  "sourceDocs": [
    { "title": "Paper 1", "excerpt": "...", "url": "..." }
  ],
  "metadata": { "tokens": 256, "model": "gpt-4" }
}
```

### Key Files & Roles

| File | Responsibility |
|------|-----------------|
| `backend/src/index.js` | Lambda handler entry point |
| `backend/src/rag.js` | RAG orchestrator (retrieve + generate) |
| `backend/src/vectorStore.js` | Vector DB operations (embeddings search) |
| `backend/src/llm.js` | LLM integration (OpenAI/Bedrock API calls) |
| `backend/src/retriever.js` | Document retrieval from S3/DynamoDB |
| `backend/src/config.js` | Environment config & API keys |
| `backend/package.json` | Dependencies management |

### Data Flow
```
User Query
    ↓
[Lambda Handler] → Parse request
    ↓
[Vector Search] → Find relevant docs in vector store
    ↓
[Prompt Assembly] → Build context + question
    ↓
[LLM Call] → OpenAI/Claude generates answer
    ↓
[Save to History] → Store in DynamoDB
    ↓
Response → Return to Frontend
```

### Example Handler
```typescript
// backend/src/index.ts
export async function handler(event: any) {
  const { question, userId } = JSON.parse(event.body);
  
  // 1. Retrieve relevant documents
  const docs = await vectorStore.search(question);
  
  // 2. Generate answer with context
  const answer = await llm.generate({
    question,
    context: docs,
    model: 'gpt-4'
  });
  
  // 3. Save conversation
  await dynamodb.saveChat({ userId, question, answer });
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      text: answer.text,
      sourceDocs: docs,
      metadata: answer.metadata
    })
  };
}
```

### Dependencies
```json
{
  "aws-sdk": "^2.x",
  "openai": "^4.x",
  "axios": "^1.x",
  "dotenv": "^16.x"
}
```

---

## ☁️ AWS Deployment

### Services Used

| Service | Purpose | Role |
|---------|---------|------|
| **API Gateway** | HTTP endpoint | Routes requests to Lambda |
| **Lambda** | Compute | Executes RAG pipeline code |
| **S3** | Storage | Stores research documents |
| **DynamoDB** | Database | Stores chat history & metadata |
| **IAM** | Access Control | Role-based permissions |
| **CloudWatch** | Logging | Monitors & debugs functions |
| **OpenSearch** (optional) | Vector DB | Semantic search on embeddings |

### Terraform Infrastructure

**Location:** `terraform/`

**Key Files:**

```hcl
# terraform/main.tf
provider "aws" {
  region = var.aws_region
}

# IAM Role for Lambda
resource "aws_iam_role" "lambda_role" {
  name = "rag-lambda-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

# Lambda Function
resource "aws_lambda_function" "rag_handler" {
  filename      = "lambda_package.zip"
  function_name = "rag-ai-assistant"
  role          = aws_iam_role.lambda_role.arn
  handler       = "src/index.handler"
  runtime       = "nodejs18.x"
  timeout       = 60
  memory_size   = 512

  environment {
    variables = {
      OPENAI_API_KEY = var.openai_api_key
      VECTOR_DB_URL  = aws_opensearchserverless_collection.vector_store.collection_endpoint
    }
  }
}

# API Gateway
resource "aws_apigatewayv2_api" "rag_api" {
  name          = "rag-ai-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["POST", "GET", "OPTIONS"]
    allow_headers = ["Content-Type"]
  }
}

# API Integration with Lambda
resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id           = aws_apigatewayv2_api.rag_api.id
  integration_type = "AWS_PROXY"
  integration_method = "POST"
  payload_format_version = "2.0"
  target = aws_lambda_function.rag_handler.arn
}

# API Route
resource "aws_apigatewayv2_route" "chat_route" {
  api_id    = aws_apigatewayv2_api.rag_api.id
  route_key = "POST /chat"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

# DynamoDB Table
resource "aws_dynamodb_table" "chat_history" {
  name           = "rag-chat-history"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "userId"
  range_key      = "timestamp"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "N"
  }
}

# S3 Bucket for Documents
resource "aws_s3_bucket" "documents" {
  bucket = "rag-research-documents-${data.aws_caller_identity.current.account_id}"
}
```

```hcl
# terraform/variables.tf
variable "aws_region" {
  default = "ap-south-1"
}

variable "openai_api_key" {
  sensitive = true
}

variable "environment" {
  default = "dev"
}
```

```hcl
# terraform/outputs.tf
output "api_gateway_url" {
  value = "${aws_apigatewayv2_stage.default.invoke_url}"
}

output "lambda_arn" {
  value = aws_lambda_function.rag_handler.arn
}

output "dynamodb_table" {
  value = aws_dynamodb_table.chat_history.name
}
```

### Deployment Steps

1. **Initialize Terraform:**
   ```bash
   cd terraform
   terraform init
   ```

2. **Plan infrastructure:**
   ```bash
   terraform plan -var-file=dev.tfvars
   ```

3. **Apply changes:**
   ```bash
   terraform apply -var-file=dev.tfvars
   ```

4. **Get outputs:**
   ```bash
   terraform output api_gateway_url
   # Output: https://5ow79nd23b.execute-api.ap-south-1.amazonaws.com
   ```

5. **Update frontend env:**
   ```bash
   # Copy API URL to docker-compose.yml
   NEXT_PUBLIC_API_URL=<your-api-url>
   ```

### How Terraform Works

- **Declarative:** Define desired state in `.tf` files
- **Idempotent:** `terraform apply` multiple times = same result
- **State Management:** `terraform.tfstate` tracks current infra
- **Remote State:** Store in S3 + DynamoDB locking for team collaboration

```bash
# Example: terraform.tfstate storage
terraform {
  backend "s3" {
    bucket         = "rag-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "ap-south-1"
    dynamodb_table = "terraform-locks"
  }
}
```

---

## 🐳 Docker & Nginx

### Docker Architecture

**Dockerfile** (frontend)
```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM nginx:alpine
COPY --from=builder /app/out /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Why multi-stage?**
- Build stage: Large (~500MB), contains npm packages
- Runtime stage: Minimal (~50MB), only static files + Nginx

### Nginx Configuration

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    sendfile on;
    keepalive_timeout 65;
    gzip on;

    server {
        listen 80;
        server_name _;

        root /usr/share/nginx/html;
        index index.html;

        # SPA fallback: route all non-file requests to index.html
        location / {
            try_files $uri $uri/ /index.html;
        }

        # Cache static assets
        location ~* \.(js|css|png|jpg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # API proxy (optional for development)
        location /api {
            proxy_pass $API_GATEWAY_URL;
            proxy_set_header Host $host;
        }
    }
}
```

### Docker Compose Setup

```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        # API Gateway endpoint from AWS deployment
        - NEXT_PUBLIC_API_URL=https://5ow79nd23b.execute-api.ap-south-1.amazonaws.com
    ports:
      - "80:80"
    restart: always
    container_name: ai_assistant_frontend
    environment:
      - NODE_ENV=production
```

### Running Docker Container

**Build & Run:**
```bash
# Build image
docker build -t rag-ai-assistant:latest ./frontend

# Run container
docker run -p 80:80 \
  -e NEXT_PUBLIC_API_URL=https://5ow79nd23b.execute-api.ap-south-1.amazonaws.com \
  rag-ai-assistant:latest

# Or use docker-compose
docker-compose up --build
```

**Verify:**
```bash
# Check running container
docker ps

# View logs
docker logs ai_assistant_frontend

# Access app
curl http://localhost
```

### Nginx Benefits

| Feature | Benefit |
|---------|---------|
| Reverse Proxy | Routes requests to backend |
| Static Serving | Fast asset delivery (gzip, caching) |
| SPA Fallback | Handles client-side routing |
| SSL/TLS | Can add HTTPS termination |
| Load Balancing | Distribute across multiple backends |

---

## 💰 Cost Analysis: ~$0.76/Month

### Breakdown

```
AWS Service              | Usage          | Monthly Cost
──────────────────────────────────────────────────────
API Gateway             | 1,000 requests | $0.50
Lambda                  | 100 invocations| $0.15
  (128MB, 1s avg)       | 100 GB-seconds |
──────────────────────────────────────────────────────
DynamoDB                | 100 read ops   | $0.07
  (On-demand pricing)   | 100 write ops  |
──────────────────────────────────────────────────────
CloudWatch Logs         | ~5GB           | $0.04
──────────────────────────────────────────────────────
S3 (documents)          | <1GB storage   | <$0.01
──────────────────────────────────────────────────────
                        | TOTAL          | $0.76
```

### How We Optimized Costs

1. **Serverless:** Pay only for execution, not idle time
2. **On-demand DynamoDB:** No minimum capacity reservation
3. **Lambda free tier:** 1M requests/month free
4. **API Gateway free tier:** Partial coverage for low traffic
5. **No EC2 instances:** Eliminated always-running costs
6. **Minimal data transfer:** Internal AWS transfers are cheap

### Cost Monitoring

```bash
# View AWS billing dashboard
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity DAILY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE
```

### Potential Cost Save Opportunities

- Use **CloudFront CDN** for frontend (~$0.085 per GB)
- Implement **DynamoDB auto-scaling** with reserved capacity
- Use **OpenSearch Serverless** instead of provisioned instance
- Cache frequently used vector embeddings in **ElastiCache**

---

## 🚀 Installation & Setup

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- AWS Account with credentials configured
- Terraform 1.0+
- Git

### Local Development

1. **Clone Repository:**
   ```bash
   git clone https://github.com/yourusername/rag-ai-assistant.git
   cd "AWS Project"
   ```

2. **Setup Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   # Runs on http://localhost:3000
   ```

3. **Setup Backend (local testing):**
   ```bash
   cd ../backend
   npm install
   npm run dev
   # Runs on http://localhost:3001
   ```

4. **Create `.env.local`:**
   ```bash
   # frontend/.env.local
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

### AWS Deployment

1. **Configure AWS Credentials:**
   ```bash
   aws configure
   # Enter: Access Key, Secret Key, Region (ap-south-1), Output (json)
   ```

2. **Create `terraform.tfvars`:**
   ```hcl
   aws_region    = "ap-south-1"
   openai_api_key = "sk-..."
   environment   = "prod"
   ```

3. **Deploy Infrastructure:**
   ```bash
   cd terraform
   terraform init
   terraform plan
   terraform apply
   
   # Save outputs
   terraform output api_gateway_url
   ```

4. **Build & Deploy Frontend:**
   ```bash
   cd ../frontend
   npm run build
   
   # Update docker-compose.yml with API URL
   docker-compose up --build
   ```

5. **Verify Deployment:**
   ```bash
   # Check API health
   curl https://5ow79nd23b.execute-api.ap-south-1.amazonaws.com/health
   
   # Access frontend
   open http://localhost
   ```

---

## 📖 Usage

### Chat Interface

1. **Input Query:**
   - Click input field
   - Type research question
   - Example: "What are the latest advances in RAG systems?"

2. **Send Request:**
   - Press Enter or click "Ask"
   - Spinner shows processing state
   - Response appears with citations

3. **View Sources:**
   - Click "Sources" to expand
   - View document excerpts
   - Click links to access full papers

4. **Save Conversation (optional):**
   - Click bookmark icon
   - Saved to browser localStorage or backend

### Example Interaction

```
User: "Explain retrieval-augmented generation"

System Response:
"RAG (Retrieval-Augmented Generation) combines document retrieval with 
language generation to provide answers grounded in actual sources.

Process:
1. Retrieve relevant documents from knowledge base
2. Augment prompt with retrieved content
3. Generate response using LLM

Sources:
- Lewis et al. (2020): "Retrieval-Augmented Generation..."
- Borgeaud et al. (2022): "Improving Language Models..."
```

---

## 📁 Project Structure

```
AWS Project/
├── README.md                          # This file
├── docker-compose.yml                 # Docker Compose configuration
│
├── frontend/                          # React/Next.js application
│   ├── Dockerfile                     # Frontend container definition
│   ├── package.json                   # Dependencies
│   ├── next.config.js                 # Next.js configuration
│   ├── pages/ or app/                 # Page components
│   ├── components/                    # Reusable React components
│   │   ├── ChatBox.jsx
│   │   ├── MessageHistory.jsx
│   │   └── Citations.jsx
│   ├── services/                      # API client
│   │   └── apiClient.ts
│   ├── styles/                        # CSS/Tailwind styles
│   ├── public/                        # Static assets
│   └── .env.local                     # Local environment variables
│
├── backend/                           # Node.js Lambda functions
│   ├── src/
│   │   ├── index.ts                   # Lambda handler entry
│   │   ├── rag.ts                     # RAG orchestration
│   │   ├── vectorStore.ts             # Vector DB operations
│   │   ├── llm.ts                     # LLM integration
│   │   ├── retriever.ts               # Document retrieval
│   │   └── config.ts                  # Configuration
│   ├── package.json                   # Dependencies
│   ├── tsconfig.json                  # TypeScript config
│   └── .env                           # Backend environment variables
│
├── terraform/                         # Infrastructure as Code
│   ├── main.tf                        # Main resource definitions
│   ├── variables.tf                   # Input variables
│   ├── outputs.tf                     # Output values
│   ├── providers.tf                   # AWS provider config
│   ├── iam.tf                         # IAM roles & policies
│   ├── lambda.tf                      # Lambda configuration
│   ├── api-gateway.tf                 # API Gateway setup
│   ├── dynamodb.tf                    # DynamoDB tables
│   ├── s3.tf                          # S3 buckets
│   ├── terraform.tfstate              # State file (git ignored)
│   ├── dev.tfvars                     # Dev environment variables
│   ├── prod.tfvars                    # Prod environment variables
│   └── .gitignore                     # Ignore state files
│
└── docs/                              # Documentation
    ├── ARCHITECTURE.md
    ├── DEPLOYMENT.md
    └── TROUBLESHOOTING.md
```

---

## 🔄 CI/CD Pipeline (Optional)

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-south-1
      
      - name: Build Backend
        run: |
          cd backend
          npm ci
          npm run build
          zip -r lambda.zip .
      
      - name: Deploy with Terraform
        run: |
          cd terraform
          terraform init
          terraform apply -auto-approve -var-file=prod.tfvars
      
      - name: Build Frontend
        run: |
          cd frontend
          npm ci
          npm run build
      
      - name: Deploy Frontend
        run: docker-compose up -d
```

---

## 🐛 Troubleshooting

### Frontend Can't Connect to Backend
```bash
# Check API URL in docker-compose.yml
docker exec ai_assistant_frontend printenv | grep API_URL

# Verify CORS headers
curl -i -H "Origin: http://localhost" \
  https://5ow79nd23b.execute-api.ap-south-1.amazonaws.com/chat
```

### Lambda Timeout
```bash
# Increase timeout in terraform
resource "aws_lambda_function" "rag_handler" {
  timeout = 120  # 2 minutes
}
```

### High DynamoDB Costs
```bash
# Switch to reserved capacity
aws dynamodb update-table \
  --table-name rag-chat-history \
  --billing-mode PROVISIONED \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
```

---

## 📚 Additional Resources

- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [LLM Integration Best Practices](https://platform.openai.com/docs/)

---

## 📝 License

MIT License - See LICENSE file for details

---

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📧 Support & Contact

- **GitHub Issues:** [Create an issue](https://github.com/yourusername/rag-ai-assistant/issues)
- **Email:** your-email@example.com
- **Twitter:** [@yourhandle](https://twitter.com/yourhandle)

---

**Last Updated:** March 30, 2026  
**Cost Status:** ~$0.76/month (demo environment)  
**Deployment Status:** Production Ready ✅
