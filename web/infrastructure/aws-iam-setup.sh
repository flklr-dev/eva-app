#!/bin/bash

# Exit on any error
set -e

# Variables
AWS_REGION="us-east-1"

echo "Setting up IAM roles and policies for EVA app..."

# Create ECS task execution role
cat > ecs-task-execution-role.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "",
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

echo "Creating ECS task execution role..."
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document file://ecs-task-execution-role.json \
  --region $AWS_REGION

# Attach the AWS managed policy for ECS task execution
echo "Attaching AWS managed policy for ECS task execution..."
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy \
  --region $AWS_REGION

# Create ECS task role
cat > ecs-task-role.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "",
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

echo "Creating ECS task role..."
aws iam create-role \
  --role-name ecsTaskRole \
  --assume-role-policy-document file://ecs-task-role.json \
  --region $AWS_REGION

# Create custom policy for accessing SSM parameters
cat > ssm-access-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameters",
        "ssm:GetParameter"
      ],
      "Resource": [
        "arn:aws:ssm:$AWS_REGION:*:parameter/eva/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt"
      ],
      "Resource": [
        "*"
      ]
    }
  ]
}
EOF

echo "Creating SSM access policy..."
aws iam create-policy \
  --policy-name eva-ssm-access \
  --policy-document file://ssm-access-policy.json \
  --region $AWS_REGION

# Attach the SSM access policy to the ECS task role
echo "Attaching SSM access policy to ECS task role..."
aws iam attach-role-policy \
  --role-name ecsTaskRole \
  --policy-arn arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/eva-ssm-access \
  --region $AWS_REGION

# Clean up
rm ecs-task-execution-role.json ecs-task-role.json ssm-access-policy.json

echo "IAM roles and policies created successfully!"