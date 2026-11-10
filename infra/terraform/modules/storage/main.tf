terraform {
  required_version = ">= 1.6.0"
}

variable "name_prefix" {
  type = string
}

output "resume_bucket_hint" {
  value       = "s3://${var.name_prefix}-resumes"
  description = "Replace with encrypted bucket + lifecycle policies."
}
