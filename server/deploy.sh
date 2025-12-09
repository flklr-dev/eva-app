#!/bin/bash

# Exit on any error
set -e

# Variables
AWS_REGION="us-east-1"
ECR_REPOSITORY_NAME="eva-app-server"
IMAGE_TAG="latest"

echo "Starting EVA app deployment..."

# Authenticate Docker to ECR
echo "Authenticating Docker to ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.$AWS_REGION.amazonaws.com

# Create ECR repository if it doesn't exist
echo "Creating ECR repository if it doesn't exist..."
aws ecr describe-repositories --repository-names $ECR_REPOSITORY_NAME --region $AWS_REGION || aws ecr create-repository --repository-name $ECR_REPOSITORY_NAME --region $AWS_REGION

# Build Docker image
echo "Building Docker image..."
docker build -t $ECR_REPOSITORY_NAME .

# Tag the image
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
docker tag $ECR_REPOSITORY_NAME:latest $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY_NAME:$IMAGE_TAG

# Push the image to ECR
echo "Pushing image to ECR..."
docker push $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY_NAME:$IMAGE_TAG

echo "Docker image pushed successfully!"