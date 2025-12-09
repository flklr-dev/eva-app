#!/bin/bash

# Exit on any error
set -e

# Variables
AWS_REGION="us-east-1"

echo "Setting up AWS Systems Manager Parameters for EVA app..."

# Store MongoDB connection string (placeholder - replace with actual connection string)
echo "Storing MongoDB connection string..."
aws ssm put-parameter \
  --name "/eva/mongodb-uri" \
  --value "mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/eva-app?retryWrites=true&w=majority" \
  --type "SecureString" \
  --region $AWS_REGION \
  --overwrite

# Store JWT secret
echo "Storing JWT secret..."
aws ssm put-parameter \
  --name "/eva/jwt-secret" \
  --value "your-super-secret-jwt-key-change-this-in-production" \
  --type "SecureString" \
  --region $AWS_REGION \
  --overwrite

# Store API URL for web dashboard (placeholder - will update after creating ALB)
echo "Storing API URL for web dashboard..."
aws ssm put-parameter \
  --name "/eva/api-url" \
  --value "http://localhost:3000" \
  --type "SecureString" \
  --region $AWS_REGION \
  --overwrite

echo "AWS Systems Manager parameters created successfully!"
echo "Remember to update the parameter values with actual values after setting up MongoDB Atlas and ALB."