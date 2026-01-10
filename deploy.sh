#!/bin/bash

# Google Cloud E-commerce App Deployment Script
# Bu script projenizi Google Cloud'a deploy eder

set -e

# Configuration
# Bu değerleri kendi projenize göre güncelleyin
PROJECT_ID="your-project-id"
REGION="europe-west1"
SERVICE_NAME="your-service-name"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Google Cloud E-commerce App Deployment${NC}"
echo "=========================================="

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Google Cloud SDK is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}⚠️  You are not authenticated with Google Cloud. Please run:${NC}"
    echo "gcloud auth login"
    exit 1
fi

# Set project
echo -e "${YELLOW}📋 Setting project to: $PROJECT_ID${NC}"
gcloud config set project $PROJECT_ID

# Enable required APIs
echo -e "${YELLOW}🔧 Enabling required APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable firebase.googleapis.com

# Build and push Docker image
echo -e "${YELLOW}🐳 Building and pushing Docker image...${NC}"
docker build -t $IMAGE_NAME .
docker push $IMAGE_NAME

# Deploy to Cloud Run
echo -e "${YELLOW}🚀 Deploying to Cloud Run...${NC}"
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10 \
  --min-instances 0 \
  --set-env-vars NODE_ENV=production \
  --set-env-vars DATABASE_URL="$DATABASE_URL" \
  --set-env-vars JWT_SECRET="$JWT_SECRET" \
  --set-env-vars NEXTAUTH_URL="$NEXTAUTH_URL" \
  --set-env-vars NEXTAUTH_SECRET="$NEXTAUTH_SECRET" \
  --set-env-vars GOOGLE_CLOUD_PROJECT="$PROJECT_ID" \
  --set-env-vars STORAGE_BUCKET="$STORAGE_BUCKET"

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Your app is available at: $SERVICE_URL${NC}"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Set up your database connection"
echo "2. Configure Firebase Auth"
echo "3. Set up Cloud Storage for images"
echo "4. Configure your domain (optional)"
