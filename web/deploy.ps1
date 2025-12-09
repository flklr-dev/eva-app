# Windows PowerShell deployment script for EVA web dashboard

# Variables
$AWS_REGION = "us-east-1"
$ECR_REPOSITORY_NAME = "eva-app-web"
$IMAGE_TAG = "latest"

Write-Host "Starting EVA web dashboard deployment..." -ForegroundColor Green

# Authenticate Docker to ECR
Write-Host "Authenticating Docker to ECR..." -ForegroundColor Yellow
$account_id = aws sts get-caller-identity --query Account --output text
$ecr_login_password = aws ecr get-login-password --region $AWS_REGION
echo $ecr_login_password | docker login --username AWS --password-stdin "${account_id}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Create ECR repository if it doesn't exist
Write-Host "Creating ECR repository if it doesn't exist..." -ForegroundColor Yellow
try {
    aws ecr describe-repositories --repository-names $ECR_REPOSITORY_NAME --region $AWS_REGION | Out-Null
    Write-Host "Repository already exists." -ForegroundColor Cyan
} catch {
    Write-Host "Creating new repository..." -ForegroundColor Cyan
    aws ecr create-repository --repository-name $ECR_REPOSITORY_NAME --region $AWS_REGION | Out-Null
}

# Build Docker image
Write-Host "Building Docker image..." -ForegroundColor Yellow
docker build -t $ECR_REPOSITORY_NAME .

# Tag the image
Write-Host "Tagging the image..." -ForegroundColor Yellow
docker tag "${ECR_REPOSITORY_NAME}:latest" "${account_id}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY_NAME}:${IMAGE_TAG}"

# Push the image to ECR
Write-Host "Pushing image to ECR..." -ForegroundColor Yellow
docker push "${account_id}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY_NAME}:${IMAGE_TAG}"

Write-Host "Docker image pushed successfully!" -ForegroundColor Green
