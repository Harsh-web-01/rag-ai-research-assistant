# 🚀 AI Research Assistant with RAG on AWS

An end-to-end **AI-powered research assistant** that leverages **Retrieval-Augmented Generation (RAG)** to provide accurate, context-aware answers from uploaded documents.

This project is built using a **serverless architecture on AWS**, integrating **Amazon Bedrock, OpenSearch Serverless, and Lambda**, with a modern **Next.js frontend**, and deployed using **Docker + Nginx**.

---

## 🌟 Features

* 📄 Upload and process research documents
* 🔍 Semantic search using vector embeddings
* 🤖 Context-aware answers using Amazon Bedrock
* ⚡ Fully serverless backend (AWS Lambda)
* 🌐 Modern frontend using Next.js
* 🐳 Containerized deployment with Docker
* 🌍 Reverse proxy using Nginx
* ☁️ Infrastructure as Code using Terraform

---

## 🏗️ Architecture Overview

### 🔄 Flow

User → Next.js Frontend → API Gateway → Lambda → OpenSearch Serverless → Amazon Bedrock → Response

---

## 🧠 How the Project Works (Detailed)

This project follows a **Retrieval-Augmented Generation (RAG)** pipeline divided into two major parts:

---

### 📥 1. Document Ingestion Pipeline

1. User uploads a document via frontend
2. Request goes through **API Gateway → Lambda (Ingestion Function)**
3. Inside Lambda:

   * Document text is extracted
   * Text is split into smaller chunks
   * Each chunk is converted into embeddings using **Amazon Titan Embedding Model (Bedrock)**
4. These embeddings are stored in **OpenSearch Serverless**

👉 This creates a searchable knowledge base

---

### 🔍 2. Query / Retrieval Pipeline

1. User sends a query from frontend
2. Request goes through **API Gateway → Lambda (Query Function)**

Inside Lambda:

* Query is converted into embedding using **Amazon Titan**
* Relevant chunks are retrieved from **OpenSearch Serverless**
* Retrieved context is combined with user query

---

### 🤖 3. Response Generation (RAG Core)

* The combined **(query + context)** is sent to:
  👉 **Amazon Nova Model (Bedrock)** for response generation

* The model generates a **context-aware answer**

👉 This ensures:

* Higher accuracy
* Reduced hallucination
* Real document-based responses

---

## ⚙️ Orchestration (How Everything Connects)

This project is orchestrated using AWS serverless services:

1. **Frontend (Next.js)**

   * Sends requests (upload/query) to backend
   * Uses environment variable for API Gateway endpoint

2. **API Gateway**

   * Acts as entry point
   * Routes:

     * `/upload` → Ingestion Lambda
     * `/query` → Query Lambda

3. **Lambda Functions**

   * Stateless compute layer
   * Handles:

     * Chunking logic
     * Embedding generation
     * OpenSearch queries
     * Bedrock invocation

4. **OpenSearch Serverless**

   * Stores embeddings
   * Performs vector similarity search

5. **Amazon Bedrock**

   * **Titan Model** → used for generating embeddings
   * **Nova Model** → used for generating final answers

---

## 🐳 Docker & Nginx (Deployment Highlight)

* The frontend is containerized using **Docker**
* **Docker Compose** is used for easy local deployment
* **Nginx** acts as a reverse proxy:

  * Routes traffic efficiently
  * Improves performance
  * Simulates production environment

👉 This demonstrates real-world deployment practices

---

## 🏗️ Architecture Diagram
![AI architecture flow on AWS 2](https://github.com/user-attachments/assets/4dbac5fe-2819-4ccf-ad84-2436b83f27d9)

## ☁️ AWS Services Used

| Service               | Purpose                                    |
| --------------------- | ------------------------------------------ |
| API Gateway           | Handles incoming HTTP requests             |
| Lambda                | Executes backend logic                     |
| S3                    | Stores uploaded documents                  |
| OpenSearch Serverless | Stores embeddings & performs vector search |
| Amazon Bedrock        | Provides LLM (Nova) & embeddings (Titan)   |
| IAM                   | Access control                             |

---

## ⚙️ Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/Harsh-web-01/rag-ai-research-assistant.git
cd rag-ai-research-assistant
```

### 2. Backend setup

```bash
cd backend
pip install -r requirements.txt
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

### 4. Run with Docker

```bash
docker-compose up --build
```

---

## 🔐 Environment Variables

Create a `.env` file:

```env
NEXT_PUBLIC_API_URL=your_api_gateway_url
```

---

## 💰 Cost Analysis

* 💵 Total Cost: **$2.73**
* Majority cost from:

  * **OpenSearch Serverless**
* Other services:

  * API Gateway → Free Tier
  * Lambda → Free Tier
  * Bedrock → Minimal usage (within free/trial limits)

👉 Demonstrates **cost-efficient serverless architecture**

---


---

## 🎯 Use Cases

* Research paper analysis
* Document Q&A systems
* Knowledge base assistants
* Enterprise search tools

---
