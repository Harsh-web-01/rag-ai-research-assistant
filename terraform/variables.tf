variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "ap-south-1"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "ai-research-assistant"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}
