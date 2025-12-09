# Windows PowerShell script for setting up IAM roles and policies for EVA app

# Variables
$AWS_REGION = "us-east-1"

Write-Host "Setting up IAM roles and policies for EVA app..." -ForegroundColor Green

# Create ECS task execution role
$ecsTaskExecutionRole = @"
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
"@

$ecsTaskExecutionRole | Out-File -FilePath "ecs-task-execution-role.json" -Encoding utf8

Write-Host "Creating ECS task execution role..." -ForegroundColor Yellow
aws iam create-role `
  --role-name ecsTaskExecutionRole `
  --assume-role-policy-document file://ecs-task-execution-role.json `
  --region $AWS_REGION | Out-Null

# Attach the AWS managed policy for ECS task execution
Write-Host "Attaching AWS managed policy for ECS task execution..." -ForegroundColor Yellow
aws iam attach-role-policy `
  --role-name ecsTaskExecutionRole `
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy `
  --region $AWS_REGION | Out-Null

# Create ECS task role
$ecsTaskRole = @"
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
"@

$ecsTaskRole | Out-File -FilePath "ecs-task-role.json" -Encoding utf8

Write-Host "Creating ECS task role..." -ForegroundColor Yellow
aws iam create-role `
  --role-name ecsTaskRole `
  --assume-role-policy-document file://ecs-task-role.json `
  --region $AWS_REGION | Out-Null

# Create custom policy for accessing SSM parameters
$ssmAccessPolicy = @"
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
        "arn:aws:ssm:${AWS_REGION}:*:parameter/eva/*"
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
"@

$ssmAccessPolicy | Out-File -FilePath "ssm-access-policy.json" -Encoding utf8

Write-Host "Creating SSM access policy..." -ForegroundColor Yellow
aws iam create-policy `
  --policy-name eva-ssm-access `
  --policy-document file://ssm-access-policy.json `
  --region $AWS_REGION | Out-Null

# Attach the SSM access policy to the ECS task role
Write-Host "Attaching SSM access policy to ECS task role..." -ForegroundColor Yellow
$accountId = aws sts get-caller-identity --query Account --output text
aws iam attach-role-policy `
  --role-name ecsTaskRole `
  --policy-arn "arn:aws:iam::$accountId:policy/eva-ssm-access" `
  --region $AWS_REGION | Out-Null

# Clean up
Remove-Item "ecs-task-execution-role.json", "ecs-task-role.json", "ssm-access-policy.json"

Write-Host "IAM roles and policies created successfully!" -ForegroundColor Green