resource "null_resource" "install_ingestion_deps" {
  triggers = {
    requirements_hash = filemd5("${path.module}/../backend/ingestion/requirements.txt")
    app_hash          = filemd5("${path.module}/../backend/ingestion/app.py")
  }
  provisioner "local-exec" {
    command = "python3 -m pip install -r ${path.module}/../backend/ingestion/requirements.txt -t ${path.module}/../backend/ingestion/package/ && cp ${path.module}/../backend/ingestion/app.py ${path.module}/../backend/ingestion/package/"
  }
}

data "archive_file" "ingestion_lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/ingestion/package/"
  output_path = "${path.module}/ingestion.zip"
  depends_on  = [null_resource.install_ingestion_deps]
}

resource "aws_lambda_function" "ingestion" {
  filename         = data.archive_file.ingestion_lambda_zip.output_path
  source_code_hash = data.archive_file.ingestion_lambda_zip.output_base64sha256
  function_name    = "${var.project_name}-ingestion"
  role             = aws_iam_role.ingestion_lambda_role.arn
  handler          = "app.lambda_handler"
  runtime          = "python3.11"
  timeout          = 300
  memory_size      = 512

  environment {
    variables = {
      OPENSEARCH_ENDPOINT = aws_opensearchserverless_collection.vector_store.collection_endpoint
      BEDROCK_REGION      = var.aws_region
      EMBEDDING_MODEL_ID  = "amazon.titan-embed-text-v2:0"
      EMBEDDING_DIMENSION = "1024"
    }
  }
}

resource "aws_lambda_permission" "allow_s3" {
  statement_id  = "AllowExecutionFromS3Bucket"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ingestion.arn
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.documents.arn
}

resource "aws_s3_bucket_notification" "bucket_notification" {
  bucket = aws_s3_bucket.documents.id
  lambda_function {
    lambda_function_arn = aws_lambda_function.ingestion.arn
    events              = ["s3:ObjectCreated:*"]
    filter_suffix       = ".pdf"
  }
  depends_on = [aws_lambda_permission.allow_s3]
}

resource "null_resource" "install_query_deps" {
  triggers = {
    requirements_hash = filemd5("${path.module}/../backend/query/requirements.txt")
    app_hash          = filemd5("${path.module}/../backend/query/app.py")
  }
  provisioner "local-exec" {
    command = "python3 -m pip install -r ${path.module}/../backend/query/requirements.txt -t ${path.module}/../backend/query/package/ && cp ${path.module}/../backend/query/app.py ${path.module}/../backend/query/package/"
  }
}

data "archive_file" "query_lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/query/package/"
  output_path = "${path.module}/query.zip"
  depends_on  = [null_resource.install_query_deps]
}

resource "aws_lambda_function" "query" {
  filename         = data.archive_file.query_lambda_zip.output_path
  source_code_hash = data.archive_file.query_lambda_zip.output_base64sha256
  function_name    = "${var.project_name}-query"
  role             = aws_iam_role.query_lambda_role.arn
  handler          = "app.lambda_handler"
  runtime          = "python3.11"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      OPENSEARCH_ENDPOINT  = aws_opensearchserverless_collection.vector_store.collection_endpoint
      DOCUMENTS_BUCKET_NAME = aws_s3_bucket.documents.bucket
      BEDROCK_REGION       = var.aws_region
      EMBEDDING_MODEL_ID   = "amazon.titan-embed-text-v2:0"
      CHAT_MODEL_ID        = "arn:aws:bedrock:ap-south-1:686348673799:inference-profile/apac.amazon.nova-micro-v1:0"
    }
  }
}

resource "aws_lambda_permission" "allow_api_gateway" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.query.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}
