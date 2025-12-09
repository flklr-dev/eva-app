# Windows PowerShell deployment script for EVA web dashboard

# Variables
$BUCKET_NAME = "eva-app-dashboard"
$AWS_REGION = "us-east-1"

Write-Host "Deploying EVA web dashboard to S3..." -ForegroundColor Green

# Create S3 bucket if it doesn't exist
Write-Host "Creating S3 bucket if it doesn't exist..." -ForegroundColor Yellow
try {
    aws s3api head-bucket --bucket $BUCKET_NAME --region $AWS_REGION | Out-Null
    Write-Host "Bucket already exists." -ForegroundColor Cyan
} catch {
    Write-Host "Creating new bucket..." -ForegroundColor Cyan
    aws s3 mb s3://$BUCKET_NAME --region $AWS_REGION | Out-Null
}

# Configure bucket for static website hosting
Write-Host "Configuring bucket for static website hosting..." -ForegroundColor Yellow
aws s3 website s3://$BUCKET_NAME --index-document index.html --error-document error.html | Out-Null

# Sync files to S3
Write-Host "Syncing files to S3..." -ForegroundColor Yellow
aws s3 sync ./public s3://$BUCKET_NAME --delete | Out-Null

# Set bucket policy for public read access
Write-Host "Setting bucket policy for public read access..." -ForegroundColor Yellow
$bucketPolicy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
    }
  ]
}
"@

$bucketPolicy | Out-File -FilePath "bucket-policy.json" -Encoding utf8

aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file://bucket-policy.json | Out-Null

# Clean up
Remove-Item "bucket-policy.json"

Write-Host "Web dashboard deployed successfully!" -ForegroundColor Green
Write-Host "Access your dashboard at: http://$BUCKET_NAME.s3-website-$AWS_REGION.amazonaws.com" -ForegroundColor Cyan