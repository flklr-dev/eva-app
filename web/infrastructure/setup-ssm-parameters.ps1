# Windows PowerShell script for setting up AWS Systems Manager Parameters for EVA app

# Variables
$AWS_REGION = "us-east-1"

Write-Host "Setting up AWS Systems Manager Parameters for EVA app..." -ForegroundColor Green

# Store MongoDB connection string (placeholder - replace with actual connection string)
Write-Host "Storing MongoDB connection string..." -ForegroundColor Yellow
aws ssm put-parameter `
  --name "/eva/mongodb-uri" `
  --value "mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/eva-app?retryWrites=true^&w=majority" `
  --type "SecureString" `
  --region $AWS_REGION `
  --overwrite | Out-Null

# Store JWT secret
Write-Host "Storing JWT secret..." -ForegroundColor Yellow
aws ssm put-parameter `
  --name "/eva/jwt-secret" `
  --value "your-super-secret-jwt-key-change-this-in-production" `
  --type "SecureString" `
  --region $AWS_REGION `
  --overwrite | Out-Null

# Store API URL for web dashboard (placeholder - will update after creating ALB)
Write-Host "Storing API URL for web dashboard..." -ForegroundColor Yellow
aws ssm put-parameter `
  --name "/eva/api-url" `
  --value "http://placeholder-url.com" `
  --type "SecureString" `
  --region $AWS_REGION `
  --overwrite | Out-Null

Write-Host "AWS Systems Manager parameters created successfully!" -ForegroundColor Green
Write-Host "Remember to update the parameter values with actual values after setting up MongoDB Atlas and ALB." -ForegroundColor Cyan