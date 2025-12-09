#!/bin/bash

# Exit on any error
set -e

# Variables
BUCKET_NAME="eva-app-dashboard"
AWS_REGION="us-east-1"

echo "Deploying EVA web dashboard to S3..."

# Create S3 bucket if it doesn't exist
echo "Creating S3 bucket if it doesn't exist..."
if aws s3api head-bucket --bucket $BUCKET_NAME --region $AWS_REGION 2>/dev/null; then
    echo "Bucket already exists."
else
    echo "Creating new bucket..."
    aws s3 mb s3://$BUCKET_NAME --region $AWS_REGION
fi

# Configure bucket for static website hosting
echo "Configuring bucket for static website hosting..."
aws s3 website s3://$BUCKET_NAME --index-document index.html --error-document error.html

# Sync files to S3
echo "Syncing files to S3..."
aws s3 sync ./public s3://$BUCKET_NAME --delete

# Set bucket policy for public read access
echo "Setting bucket policy for public read access..."
cat > bucket-policy.json << EOF
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
EOF

aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file://bucket-policy.json

# Clean up
rm bucket-policy.json

echo "Web dashboard deployed successfully!"
echo "Access your dashboard at: http://$BUCKET_NAME.s3-website-$AWS_REGION.amazonaws.com"