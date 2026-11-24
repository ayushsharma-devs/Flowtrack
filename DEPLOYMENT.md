# FlowTrack — Production Hosting & Deployment Guide

This guide covers everything required to host **FlowTrack** on **Amazon Web Services (AWS)** and configure the multi-user collaboration and invitation system powered by **Amazon SES**.

---

## 🏗 Architecture Overview

FlowTrack is deployed using a containerized multi-tier architecture:

```
                  ┌───────────────────────────────────────────────┐
                  │                 Internet                      │
                  └───────────────────────┬───────────────────────┘
                                          │  HTTPS (:443) / HTTP (:80)
                                          ▼
                  ┌───────────────────────────────────────────────┐
                  │                 AWS EC2 / ALB                 │
                  │  ┌─────────────────────────────────────────┐  │
                  │  │          Nginx Reverse Proxy            │  │
                  │  └────────────┬────────────────────────────┘  │
                  │               │                               │
                  │       ┌───────┴───────┐                       │
                  │       ▼               ▼                       │
                  │  ┌─────────┐    ┌──────────┐                  │
                  │  │ Frontend│    │ Backend  │                  │
                  │  │ Next.js │    │  Django  │                  │
                  │  │ (:3000) │    │ (:8000)  │                  │
                  │  └─────────┘    └────┬─────┘                  │
                  └──────────────────────┼────────────────────────┘
                                         │
                   ┌─────────────────────┴──────────────────────┐
                   │                                            │
                   ▼                                            ▼
       ┌───────────────────────┐                    ┌───────────────────────┐
       │     AWS RDS (Postgres)│                    │       Amazon SES      │
       │    Production Database│                    │ Email Invites Engine  │
       └───────────────────────┘                    └───────────────────────┘
```

- **Frontend**: Next.js 14 (standalone output), running on Node 18.
- **Backend**: Django REST Framework + Gunicorn WSGI server.
- **Static Assets**: WhiteNoise compression + Nginx caching.
- **Reverse Proxy**: Nginx container routing `/api/` and `/admin/` to Django and all other routes to Next.js.
- **Database**: AWS RDS PostgreSQL (multi-AZ recommended for high availability).
- **Email Delivery**: Amazon SES (Simple Email Service) for sending project invitations.

---

## 📋 Prerequisites

1. An **AWS Account** with administrative permissions.
2. A **Domain Name** (e.g. `flowtrack.yourcompany.com`) managed via Route 53 or your DNS registrar.
3. An **SSH key pair** for EC2 access.

---

## 🚀 Step 1: AWS Infrastructure Provisioning

### 1. Amazon RDS PostgreSQL
1. Go to AWS Console → **RDS** → **Create database**.
2. Engine type: **PostgreSQL** (version 15 or 16).
3. Template: **Free tier** (or **Production** with db.t4g.micro / db.t4g.small).
4. DB instance identifier: `flowtrack-postgres`.
5. Master username: `flowtrack_user`.
6. Master password: Generate a strong password (save this).
7. Connectivity:
   - VPC: Default or your custom VPC.
   - Public access: **No** (accessible from EC2 within the same VPC security group).
   - VPC security group: Create or attach a group allowing inbound port `5432` from your EC2 security group.
8. Additional configuration → Initial database name: `flowtrack_db`.
9. Click **Create database** and note the **Endpoint address** once available.

### 2. Amazon SES (Email Invitations)
1. Go to AWS Console → **Amazon SES**.
2. In **Configuration** → **Identities**, click **Create identity**.
3. Choose **Domain** (or **Email address** if testing in sandbox mode).
4. Add the generated DKIM/CNAME records to your DNS provider (e.g. Route 53).
5. If in SES Sandbox mode:
   - Verify recipient test emails or request production access via **Account dashboard** → **Request production access**.
6. Create IAM credentials for SES:
   - Go to IAM → **Users** → **Create user** (e.g., `flowtrack-ses-mailer`).
   - Attach policy `AmazonSESFullAccess` (or restricted `ses:SendEmail` policy).
   - Generate an **Access Key ID** and **Secret Access Key**.

### 3. Amazon EC2 Instance
1. Go to AWS Console → **EC2** → **Launch instance**.
2. Name: `flowtrack-server`.
3. AMI: **Ubuntu Server 24.04 LTS (HVM)** (64-bit x86 or ARM64).
4. Instance type: `t3.small` or `t3.medium` (minimum 2 GB RAM recommended for building Next.js).
5. Key pair: Select your SSH key pair.
6. Network settings:
   - Allow **SSH** (port 22) from your IP.
   - Allow **HTTP** (port 80) from anywhere (0.0.0.0/0).
   - Allow **HTTPS** (port 443) from anywhere (0.0.0.0/0).
7. Storage: 20–30 GB gp3 SSD.
8. Click **Launch instance**.

---

## ⚙️ Step 2: Server Setup & Dependencies

Connect to your EC2 instance via SSH:
```bash
ssh -i /path/to/your-key.pem ubuntu@<EC2-PUBLIC-IP>
```

Update system packages and install Docker with Docker Compose plugin:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg git

# Install Docker official GPG key & repository
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Allow ubuntu user to execute docker without sudo
sudo usermod -aG docker $USER
newgrp docker
```

---

## 📦 Step 3: Application Configuration

1. Clone your FlowTrack repository to `/opt/flowtrack` or `~/flowtrack`:
```bash
git clone <YOUR-GIT-REPOSITORY-URL> flowtrack
cd flowtrack
```

2. Create the production environment file from the template:
```bash
cp .env.production.example .env.production
nano .env.production
```

3. Populate `.env.production` with your live credentials:
```ini
# Django Core
SECRET_KEY=generate_a_very_long_secure_random_string_here
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com,<EC2_PUBLIC_IP>
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
CSRF_TRUSTED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
SECURE_SSL_REDIRECT=False  # Set to True once SSL is installed

# RDS PostgreSQL Database URL
DATABASE_URL=postgres://flowtrack_user:YOUR_RDS_PASSWORD@flowtrack-postgres.xxxxxx.us-east-1.rds.amazonaws.com:5432/flowtrack_db

# Amazon SES Configuration
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_SES_REGION_NAME=us-east-1
DEFAULT_FROM_EMAIL=FlowTrack <noreply@yourdomain.com>

# Frontend Config
NEXT_PUBLIC_API_URL=https://yourdomain.com
```

---

## 🚢 Step 4: Deploy Using Docker Compose

Make the deploy script executable and run it:
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

Or execute directly with docker compose:
```bash
# Build production images
docker compose -f docker-compose.prod.yml build

# Launch services in background
docker compose -f docker-compose.prod.yml up -d

# Run database migrations
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate --noinput

# Create an initial Django superuser (optional admin access)
docker compose -f docker-compose.prod.yml exec -it backend python manage.py createsuperuser
```

Check running container status:
```bash
docker compose -f docker-compose.prod.yml ps
```

---

## 🔒 Step 5: SSL / HTTPS Setup with Let's Encrypt

To serve traffic securely over HTTPS on port 443 with automated renewals:

1. Install Certbot on the host:
```bash
sudo apt install -y certbot python3-certbot-nginx
```

2. Point your domain DNS `A` records (`yourdomain.com` and `www.yourdomain.com`) to your EC2 Public IP.

3. Stop the Docker Nginx temporarily to obtain the certificate:
```bash
docker compose -f docker-compose.prod.yml stop nginx
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
```

4. Mount certificates into `docker-compose.prod.yml` and enable HTTPS in `nginx/nginx.conf`, or run host-level Nginx as an SSL terminator proxying to container port 80.

5. Update `.env.production`:
```ini
SECURE_SSL_REDIRECT=True
```
And restart:
```bash
docker compose -f docker-compose.prod.yml up -d
```

---

## 👥 Multi-User Collaboration & Invitation Feature Guide

FlowTrack now provides enterprise-grade, role-based project collaboration:

### 1. Roles & Permissions Matrix
| Capability | Owner | Admin | Editor | Viewer |
|:---|:---:|:---:|:---:|:---:|
| View Tasks, DAG Graphs, Analytics & Audit Logs | ✅ | ✅ | ✅ | ✅ |
| Create, Edit & Reorder Tasks | ✅ | ✅ | ✅ | ❌ |
| Create & Remove Dependencies (DAG Links) | ✅ | ✅ | ✅ | ❌ |
| Change Task Status & Mark Complete | ✅ | ✅ | ✅ | ❌ |
| Invite Collaborators by Email | ✅ | ✅ | ❌ | ❌ |
| Remove Collaborators | ✅ | ✅ (non-admins) | ❌ | ❌ |
| Change Collaborator Roles | ✅ | ❌ | ❌ | ❌ |
| Delete or Rename Project | ✅ | ❌ | ❌ | ❌ |
| Leave Project | ❌ (Must delete/transfer) | ✅ | ✅ | ✅ |

### 2. How Teammates are Invited
1. Inside any project workspace, navigate to the **Team & Access** tab (or click **Invite Collaborator** in the header).
2. Enter the teammate's email address and choose their role (**Admin**, **Editor**, or **Viewer**).
3. Click **Send Invitation**.
4. The system automatically:
   - Creates a cryptographically secure 48-byte token.
   - Generates an invitation expiring in 7 days.
   - Dispatches an invitation email via Amazon SES containing the direct join link.
   - Also presents a copyable join link on screen for immediate sharing via Slack, Teams, or chat.

### 3. How Teammates Accept Invitations
- When a teammate opens the invite link (`/invitations/accept?token=...`):
  - If they are already logged in, the invitation is accepted in one click and they are added directly to the project workspace.
  - If they are not logged in, they are guided to log in or register a new account, which immediately activates their project membership upon completion.
- When logged-in users visit their **Dashboard** or **Projects** page, pending invitations appear as interactive notification banners with instant **Accept & Join** and **Decline** options.

---

## 📊 Maintenance & Operational Commands

```bash
# View aggregated container logs
docker compose -f docker-compose.prod.yml logs -f

# View backend Django logs specifically
docker compose -f docker-compose.prod.yml logs -f backend

# Run Django management commands
docker compose -f docker-compose.prod.yml exec backend python manage.py <command>

# Create database backup
docker compose -f docker-compose.prod.yml exec backend pg_dump $DATABASE_URL > backup_$(date +%F).sql

# Restart services after code update
git pull
./scripts/deploy.sh
```
