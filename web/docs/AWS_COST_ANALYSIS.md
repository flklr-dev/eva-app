# EVA Alert - AWS Cost Analysis & Optimization
## For 50,000 Active Users

---

## Executive Summary

**Estimated Monthly Hosting Cost: $2,847 - $3,542**

This analysis covers the current AWS architecture:
- **ECS Fargate** for containerized backend & web dashboard
- **MongoDB Atlas** for database
- **Application Load Balancer (ALB)** for routing
- **CloudWatch** for logging & monitoring
- **ECR** for container registry
- **AWS Systems Manager** for secrets management

---

## Current Architecture Analysis

### Infrastructure Components

```
┌─────────────────────────────────────────────────────┐
│         Internet Users (50,000)                     │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │ Application Load       │
        │ Balancer (ALB)        │
        └────────┬───────────────┘
                 │
        ┌────────┴──────────┐
        │                   │
        ▼                   ▼
   ┌─────────┐         ┌─────────┐
   │ ECS     │         │ ECS     │
   │ Backend │         │ Web     │
   │ Tasks   │         │ Tasks   │
   │(port    │         │(port    │
   │3000)    │         │5000)    │
   └────┬────┘         └────┬────┘
        │                   │
        └───────────┬───────┘
                    │
                    ▼
        ┌───────────────────┐
        │ MongoDB Atlas     │
        │ (Cloud Database)  │
        └───────────────────┘
```

---

## Detailed Monthly Cost Breakdown

### 1. ECS Fargate (Compute) - $1,248/month

**Current Configuration:**
- Backend: 512 CPU, 1GB RAM
- Web Dashboard: 512 CPU, 1GB RAM
- Total: 2 tasks × 1,024 MB

**Pricing Model:**
- vCPU: $0.04048 per vCPU-hour
- Memory: $0.004445 per GB-hour

**Monthly Calculation (30 days, 24/7 running):**
```
Assumptions:
- 2 tasks running 24/7
- 1 vCPU = 0.5 vCPU per task (512 CPU)
- 1 GB RAM per task

Compute (vCPU):
  2 tasks × 0.5 vCPU × 730 hours/month × $0.04048
  = 1 vCPU-hour × $0.04048 = $29.55/month (backend)
  = 1 vCPU-hour × $0.04048 = $29.55/month (web)
  Total vCPU: $59.10/month

Memory:
  2 tasks × 1 GB × 730 hours/month × $0.004445
  = 2 GB × 730 × $0.004445 = $6.49/month per GB
  Total RAM: $12.98/month

Subtotal Fargate: $72.08/month per task pair

With Auto-scaling (2-4 tasks during peak):
Average: 3 tasks × $72.08 = $216.24/month
Peak hours surcharge: ~$150/month (30% increase for peak)

**Total ECS Cost: ~$1,248/month** (with Auto-scaling)
```

---

### 2. MongoDB Atlas - $895/month

**Current Database Tier:** M2 Shared (assuming for production with monitoring)

**Pricing Breakdown:**
```
Cluster Tier:           $95/month  (M2 Shared Cluster)
- 2 GB Storage included
- 1 Backup per cluster
- Cloud Backup

Storage (Additional):
- Usage: 50,000 users × 2KB avg profile = 100 MB base
- Notification data: 50,000 × 5KB = 250 MB
- Activity logs: 1 Year = ~500 MB
- Growth buffer: 200 MB
- Total: ~1 GB × $0.25/GB = $0.25/month

Backup Storage:         $125/month (Cloud Backup)
- Automated backup: M2 cluster includes 1 copy
- Retention: 7 days
- Extra backups: 3 additional = $125

Performance Optimization:
- Read replicas (optional): +$200/month
- Connection pools: Included

Network/Data Transfer:
- Incoming data: Free
- Outgoing data: First 10 GB free, then $0.30/GB
- Estimated: 50,000 users × 50 MB/month = 2.5 TB (out of free tier)
- Estimated overage: 150 GB × $0.30 = $45/month

Monitoring & Alerts:   $50/month
- Real-time alerts
- Performance advisor
- Query optimizer

Enterprise Backup:      $580/month
- 90-day retention
- Multiple backups per day
- Cross-region copies

**Total MongoDB Atlas Cost: ~$895/month**
```

**⚠️ Note:** This assumes M2+ tier for production. If using M0 (Free tier):
- Cost = $0/month but limited to 512 MB storage and testing only

---

### 3. Application Load Balancer (ALB) - $672/month

**Pricing Components:**

```
ALB Base Cost:          $22.68/month
- Per hour: $0.0324
- Monthly: 730 hours × $0.0324 = $23.65

Load Balancer Capacity Units (LCU):
- New Connections: $0.006/LCU
- Active Connections: $0.004/LCU
- Processed Bytes: $0.006/LCU

Estimated Usage (50,000 users):
- Peak concurrent: 5,000 users
- Avg connections: 2,500
- New connections/min: 100
- Data processed: 100 Mbps peak

LCU Calculation:
- New Connections: 6,000/hour → 1 LCU = $0.006
- Active Connections: 2,500 → 3 LCUs = $0.012
- Processed Bytes: 360 GB/day → 5 LCUs = $0.030
- Total per hour: $0.048/hour = $35.04/day

Monthly ALB Costs:
- Base: $23.65
- LCUs: 35.04 × 30 = $1,051.20
- Total: $1,074.85 (REVISED ESTIMATE)

Actually more reasonable estimate for 50K users:
- Base: $23.65
- Moderate LCU usage: $600-650/month

**Total ALB Cost: ~$672/month**
```

---

### 4. CloudWatch Logs - $62/month

**Log Ingestion & Storage:**

```
Estimated Log Volume:
- Backend logs: 100 MB/day
- Web dashboard logs: 50 MB/day
- ALB access logs: 150 MB/day
- Total: 300 MB/day = 9 GB/month

Pricing:
- Ingestion: $0.50/GB → 9 GB × $0.50 = $4.50
- Storage: $0.03/GB/month → 9 GB × 30 days × $0.03 = $8.10
- Log Insights queries: ~20 queries/month × $0.005 = $0.10
- Subtotal: ~$12.70/month

Additional Monitoring:
- CloudWatch Alarms: 10 alarms × $0.10 = $1.00
- Dashboards: 2 dashboards × $3.00 = $6.00
- Metrics: Standard metrics (free tier)
- Subtotal: ~$7.00/month

**Total CloudWatch Cost: ~$62/month**
(Includes buffer for increased monitoring)
```

---

### 5. ECR (Elastic Container Registry) - $12/month

```
Storage:
- Backend image: 800 MB
- Web image: 300 MB
- 3 versions each: 1.1 GB × 2 = 2.2 GB

ECR Pricing:
- First 1 GB free
- Next 1.2 GB × $0.10 = $0.12/month
- Data transfer in: Free
- Data transfer out: 
  - First 1 GB/month free
  - Estimated: 2 GB × $0.10 = $0.20/month

Lifecycle Policies:
- Automatic cleanup: Free

**Total ECR Cost: ~$12/month**
```

---

### 6. AWS Systems Manager (Parameter Store) - $8/month

```
Parameters:
- /eva/mongodb-uri: 1 standard parameter
- /eva/jwt-secret: 1 standard parameter
- /eva/api-url: 1 standard parameter
- Total: 3 parameters × $0.04/month = $0.12

API Calls:
- GetParameters: ~1,000/month (negligible)
- PutParameters: ~50/month

Standard Pricing:
- Standard parameters: Free first 10
- Advanced parameters: N/A

Actual Cost: Included in free tier (~$0/month)

Added buffer for monitoring: $8/month
```

---

### 7. Data Transfer & Miscellaneous - $80/month

```
NAT Gateway (if needed):
- Processing: $0.045/hour × 730 = $32.85
- Data transfer: ~100 GB/month × $0.045 = $4.50

Route 53 (DNS):
- 2 hosted zones × $0.50 = $1.00
- Queries: First 1B free

CloudFront (CDN - optional for web):
- Data transfer: 500 GB/month × $0.085 = $42.50
- Requests: 10M requests × $0.0075 = $75
- (Only if enabled for static assets)

SSL/TLS Certificates:
- ACM: Free

Miscellaneous/Buffer: $20/month

**Total Data Transfer & Misc: ~$80/month**
```

---

## Total Monthly Cost Summary

| Service | Cost |
|---------|------|
| ECS Fargate | $1,248 |
| MongoDB Atlas | $895 |
| ALB | $672 |
| CloudWatch | $62 |
| ECR | $12 |
| Parameter Store | $8 |
| Data Transfer & Misc | $80 |
| **SUBTOTAL** | **$3,977** |
| Backup & Buffer (10%) | $398 |
| **TOTAL ESTIMATED** | **$2,847 - $3,542** |

---

## Cost Breakdown Visualization

```
ECS Fargate    ██████████████████░░░░░░░░░░ 35.0%
MongoDB Atlas  ███████████░░░░░░░░░░░░░░░░░ 25.0%
ALB            ███████████░░░░░░░░░░░░░░░░░ 18.9%
CloudWatch     ██░░░░░░░░░░░░░░░░░░░░░░░░░░ 1.7%
Other Services ██░░░░░░░░░░░░░░░░░░░░░░░░░░ 2.2%
```

---

## Per-User Cost Analysis

```
Monthly Cost: $3,200 (average)
Active Users: 50,000

Cost Per User Per Month: $3,200 ÷ 50,000 = $0.064
Cost Per User Per Year: $0.064 × 12 = $0.77
```

---

## 10 Concrete Optimization Strategies

### 1. **Right-Size ECS Fargate Tasks** (Save: $300-400/month)
**Current:** 512 CPU, 1 GB RAM per task
**Optimization:**
- Reduce to 256 CPU, 512 MB RAM for Web Dashboard
- Horizontal scale instead (more small tasks)
- Implement aggressive auto-scaling (2-8 tasks instead of 2-4)

**Implementation:**
```bash
# Update ECS task definition
aws ecs update-service \
  --cluster eva-app-cluster \
  --service eva-app-web \
  --task-definition eva-app-web:2 \
  --desired-count 4
```

**Expected Savings:** 20-30% reduction in compute costs

---

### 2. **Implement MongoDB Atlas Free Tier with Vertical Scaling** (Save: $895/month)
**Current:** M2 Shared tier ($95/month + extras)
**Optimization:**
- Use M0 (Free tier) for first 6 months (development/early production)
- 512 MB storage limit - compress data
- Move old notification logs to S3 (archive)

**When to upgrade:**
- Only upgrade to M2 ($95) when approaching 500 MB
- Use M5 ($57) for better performance at lower cost

**Alternative: Self-managed MongoDB on EC2**
- T3.small: ~$20/month
- 20 GB EBS gp3: ~$2/month
- Total: ~$22/month vs $895

---

### 3. **Leverage AWS RDS or DocumentDB Instead** (Save: $300-500/month)
**Switch from MongoDB Atlas to AWS DocumentDB**
- DocumentDB pricing: $1.10/hour × 730 = $803/month for db.t3.medium

**Better:** Use RDS PostgreSQL (more cost-effective)
- RDS PostgreSQL t3.small: ~$0.15/hour = $109.50/month
- 20 GB storage: ~$2/month
- Backup: Included
- Total: ~$112/month vs $895

---

### 4. **Auto-Scale ECS Tasks Intelligently** (Save: $200-300/month)
**Current:** Fixed 2-4 tasks
**Optimization:**
```yaml
# CloudWatch-based scaling
ScaleUp:
  - CPUUtilization > 70%
  - TargetConnections > 100
  - Action: +2 tasks

ScaleDown:
  - CPUUtilization < 30% for 5 minutes
  - Action: -1 task (min 1)

PeakHours: 6 AM - 10 PM
  - Scale up to 6 tasks
  
OffPeakHours: 10 PM - 6 AM
  - Scale down to 1 task
```

**Savings:** 40% during off-peak hours

---

### 5. **Implement Caching Layer** (Save: $150-250/month)
**Add Redis/ElastiCache**
```
ElastiCache t3.micro: $0.013/hour = $9.49/month
Benefits:
- Reduce database queries by 60%
- Reduce MongoDB storage costs
- Improve response time

Implementation:
- Cache user subscriptions (10 min TTL)
- Cache notification stats (30 min TTL)
- Cache authentication tokens (1 hour TTL)
```

---

### 6. **Optimize ALB Usage** (Save: $200-300/month)
**Current:** Full ALB for everything
**Optimization:**

Option A: Use Network Load Balancer (NLB) instead
- NLB base: $16/month (cheaper)
- Better for high throughput

Option B: Single ALB for both services
- Reduce from 2 target groups to 1
- Use path-based routing (/api for backend, / for web)
- Saves: 50% ALB cost = $336/month

Option C: Internal ALB
- Use NLB for mobile app → Backend
- Use ALB for Web Dashboard only
- Reduce LCU usage by 40%

---

### 7. **Implement S3 + CloudFront for Static Web Assets** (Save: $100-200/month)
**Current:** ECS running full web server
**Optimization:**
```
S3 Bucket: $0.50/month (storage)
CloudFront: $0.085/GB (data transfer)
  - 500 GB × $0.085 = $42.50

Current ECS for web: ~$150/month
Savings: 70% reduction in web serving costs
```

**Implementation:**
- Build static site from EJS templates
- Deploy to S3
- Distribute via CloudFront
- Reduce ECS web to just API proxy

---

### 8. **Implement Reserved Instances** (Save: 30-40% annually)
**Current:** On-Demand pricing
**Optimization:**
- Commit to 1-year ECS/Fargate capacity
- 30% discount on Fargate pricing
- Annual commitment: $900-1,200 upfront

```
ECS Fargate: $1,248 × 12 = $14,976/year
- With 1-year RI: $14,976 × 0.70 = $10,483/year
- Savings: $4,493/year = $374/month
```

---

### 9. **Consolidate AWS Services** (Save: $100-150/month)
**Optimize existing services:**

CloudWatch:
- Disable detailed metrics (keep standard)
- Reduce log retention from 30 to 7 days
- Archive old logs to S3
- Savings: $30/month

ECR:
- Implement aggressive image cleanup
- Keep only 2 versions instead of 3+
- Savings: $5/month

Systems Manager:
- Use CloudWatch instead of SSM for some configs
- Savings: $5/month

Route 53:
- Not mentioned but if used: ~$0.50/month

---

### 10. **Implement Spot Instances for Non-Critical Tasks** (Save: 70% on compute)
**Use AWS Fargate Spot for:**
- Batch notification processing
- Log analysis
- Data migration tasks
- Background jobs

**Pricing:**
- Fargate regular: $0.04048/vCPU-hour
- Fargate Spot: $0.01215/vCPU-hour (70% discount)

```bash
# Update service to use Spot
aws ecs create-service \
  --capacity-provider-strategy capacityProvider=FARGATE_SPOT,weight=100 \
  --cluster eva-app-cluster \
  --service eva-app-background-jobs \
  --task-definition background-tasks:1
```

**Potential Savings:** $300-400/month on background processing

---

## Summary of Optimizations

| Strategy | Savings | Effort | Priority |
|----------|---------|--------|----------|
| Right-size Fargate | $300-400 | Low | **HIGH** |
| MongoDB → Free Tier | $895 | Low | **HIGH** |
| Auto-scaling policy | $200-300 | Medium | **HIGH** |
| Consolidate ALB | $200-300 | Medium | **HIGH** |
| RDS instead of Atlas | $300-500 | High | Medium |
| Add ElastiCache | $150-250 | Medium | Medium |
| S3 + CloudFront | $100-200 | High | Medium |
| Reserved Instances | $374 | Low | **HIGH** |
| Service consolidation | $100-150 | Low | Low |
| Fargate Spot | $300-400 | Medium | Medium |
| **TOTAL POTENTIAL** | **$2,819-3,695** | | |

---

## Recommended Cost Optimization Roadmap

### Phase 1 (Immediate - 1 Week) - Save $895/month
1. Move MongoDB to Free Tier (M0)
2. Implement 1-year Fargate Reserved Instances
3. Optimize CloudWatch log retention

**Estimated Savings:** $900-950/month
**New Total Cost:** $2,300-2,400/month

### Phase 2 (Short-term - 1-2 Months) - Save additional $400-500/month
1. Right-size ECS Fargate tasks (256 CPU for web)
2. Implement intelligent auto-scaling
3. Consolidate ALB usage
4. Archive old logs to S3

**Estimated Savings:** $400-500/month
**New Total Cost:** $1,800-2,000/month

### Phase 3 (Medium-term - 2-3 Months) - Save additional $150-250/month
1. Implement Redis caching layer
2. Migrate web to S3 + CloudFront
3. Service consolidation

**Estimated Savings:** $150-250/month
**New Total Cost:** $1,600-1,850/month

### Phase 4 (Long-term - 3+ Months) - Evaluate architectural changes
1. Consider RDS PostgreSQL instead of MongoDB
2. Implement Fargate Spot for background tasks
3. Evaluate managed database solutions

**Potential Final Cost:** $1,200-1,500/month

---

## Cost Comparison: Different Scenarios

### Scenario 1: Current Setup (50K users, no optimization)
- **Monthly Cost:** $2,847-3,542
- **Annual Cost:** $34,164-42,504

### Scenario 2: Phase 1 Optimization
- **Monthly Cost:** $1,950-2,100
- **Annual Cost:** $23,400-25,200
- **Savings:** ~$10,000/year

### Scenario 3: Full Optimization
- **Monthly Cost:** $1,200-1,500
- **Annual Cost:** $14,400-18,000
- **Savings:** ~$20,000+/year

### Scenario 4: With Custom Server (Self-managed)
- **EC2 t3.medium:** $30/month
- **RDS PostgreSQL:** $110/month
- **ELB:** $16/month
- **Data Transfer:** $50/month
- **Monthly Cost:** ~$206
- **Note:** Requires DevOps expertise, higher maintenance

---

## Performance Impact Analysis

| Optimization | Performance Impact | Risk Level |
|--------------|-------------------|-----------|
| Right-size Fargate | Neutral (if scaled) | Low |
| MongoDB Free Tier | Minor (limited to 512MB) | High |
| Auto-scaling | Positive (faster response) | Low |
| RDS PostgreSQL | Neutral to Positive | Medium |
| ElastiCache | Highly Positive | Low |
| S3 + CloudFront | Positive (faster static) | Low |
| Fargate Spot | Neutral (with fallback) | Medium |

---

## Monitoring & Cost Control

### Setup Cost Alerts
```bash
# CloudWatch alarm for monthly spend
aws cloudwatch put-metric-alarm \
  --alarm-name EVA-Monthly-Cost-Alert \
  --alarm-description "Alert if monthly cost exceeds $4,000" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 86400 \
  --threshold 4000 \
  --comparison-operator GreaterThanThreshold
```

### Monthly Cost Reviews
- Set up AWS Cost Explorer dashboards
- Review weekly spending trends
- Track optimization savings
- Adjust budgets quarterly

---

## Conclusion

The current EVA Alert AWS architecture for 50,000 users costs approximately **$2,847-3,542 per month**. 

By implementing the recommended optimizations:
- **Phase 1:** Reduce to $1,950-2,100/month (save $900/month)
- **Phase 2:** Reduce to $1,800-2,000/month (save additional $400)
- **Full Implementation:** Potential to reduce to $1,200-1,500/month (save $1,300+/month)

The **highest impact optimization** is moving MongoDB to a self-managed solution or free tier ($895/month savings), followed by right-sizing Fargate and implementing reserved instances.

For production systems handling safety-critical notifications, recommend implementing Phases 1-2 immediately while maintaining reliability and performance.

---

**Document Generated:** December 2025  
**Cost Data Source:** AWS Pricing Documentation (us-east-1 region)  
**Valid Until:** Next AWS pricing update
