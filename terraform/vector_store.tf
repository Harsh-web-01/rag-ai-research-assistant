resource "aws_opensearchserverless_security_policy" "encryption" {
  name        = "${var.project_name}-enc"
  type        = "encryption"
  policy      = jsonencode({
    Rules = [
      {
        Resource     = ["collection/${var.project_name}-collection"]
        ResourceType = "collection"
      }
    ],
    AWSOwnedKey = true
  })
}

resource "aws_opensearchserverless_security_policy" "network" {
  name        = "${var.project_name}-net"
  type        = "network"
  policy      = jsonencode([
    {
      Rules = [
        {
          Resource     = ["collection/${var.project_name}-collection"]
          ResourceType = "dashboard"
        },
        {
          Resource     = ["collection/${var.project_name}-collection"]
          ResourceType = "collection"
        }
      ]
      AllowFromPublic = true
    }
  ])
}

resource "aws_opensearchserverless_collection" "vector_store" {
  name       = "${var.project_name}-collection"
  type       = "VECTORSEARCH"
  depends_on = [
    aws_opensearchserverless_security_policy.encryption,
    aws_opensearchserverless_security_policy.network
  ]
}

output "vector_store_endpoint" {
  value = aws_opensearchserverless_collection.vector_store.collection_endpoint
}
