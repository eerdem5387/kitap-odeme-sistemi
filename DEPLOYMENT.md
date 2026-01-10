# 🚀 Google Cloud Deployment Rehberi

Bu rehber, e-commerce uygulamanızı Google Cloud Platform üzerinde yayına almak için adım adım talimatları içerir.

## 📋 Ön Gereksinimler

1. **Google Cloud SDK** kurulu olmalı
2. **Docker** kurulu olmalı
3. **Node.js 20** kurulu olmalı
4. **Google Cloud hesabı** ve proje oluşturulmuş olmalı

## 🔧 Kurulum Adımları

### 1. Google Cloud SDK Kurulumu

```bash
# macOS için
brew install google-cloud-sdk

# veya resmi installer kullanın
# https://cloud.google.com/sdk/docs/install
```

### 2. Google Cloud'a Giriş

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### 3. Gerekli API'leri Etkinleştirin

```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable firebase.googleapis.com
```

## 🗄️ Veritabanı Kurulumu (Cloud SQL)

### 1. PostgreSQL Instance Oluşturun

```bash
gcloud sql instances create ecommerce-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=europe-west1 \
  --storage-type=SSD \
  --storage-size=10GB \
  --backup-start-time=02:00 \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=03:00
```

### 2. Veritabanı Oluşturun

```bash
gcloud sql databases create ecommerce_db --instance=ecommerce-db
```

### 3. Kullanıcı Oluşturun

```bash
gcloud sql users create ecommerce_user \
  --instance=ecommerce-db \
  --password=YOUR_SECURE_PASSWORD
```

### 4. Connection String'i Alın

```bash
gcloud sql instances describe ecommerce-db --format="value(connectionName)"
```

## 🗂️ Cloud Storage Kurulumu

### 1. Storage Bucket Oluşturun

```bash
gsutil mb -l europe-west1 gs://YOUR_PROJECT_ID-ecommerce-assets
```

### 2. Bucket'ı Public Yapın (Resimler için)

```bash
gsutil iam ch allUsers:objectViewer gs://YOUR_PROJECT_ID-ecommerce-assets
```

## 🔐 Firebase Kurulumu (Opsiyonel)

### 1. Firebase Projesi Oluşturun

```bash
firebase init
```

### 2. Authentication'ı Etkinleştirin

Firebase Console'da:
- Authentication > Sign-in method
- Email/Password ve Google'ı etkinleştirin

## ⚙️ Environment Variables

`.env.local` dosyasını oluşturun:

```env
# Database
DATABASE_URL="postgresql://ecommerce_user:YOUR_PASSWORD@YOUR_INSTANCE_IP:5432/ecommerce_db"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-here"
NEXTAUTH_URL="https://your-app-url.vercel.app"
NEXTAUTH_SECRET="your-nextauth-secret-here"

# Google Cloud
GOOGLE_CLOUD_PROJECT="your-project-id"
STORAGE_BUCKET="your-project-id-ecommerce-assets"

# Firebase (Opsiyonel)
NEXT_PUBLIC_FIREBASE_API_KEY="your-firebase-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789"
NEXT_PUBLIC_FIREBASE_APP_ID="your-firebase-app-id"
```

## 🚀 Deployment

### Otomatik Deployment (Önerilen)

```bash
# Deploy script'ini çalıştırılabilir yapın
chmod +x deploy.sh

# Environment variables'ları set edin
export DATABASE_URL="your-database-url"
export JWT_SECRET="your-jwt-secret"
export NEXTAUTH_URL="https://your-app-url.vercel.app"
export NEXTAUTH_SECRET="your-nextauth-secret"
export STORAGE_BUCKET="your-storage-bucket"

# Deploy edin
./deploy.sh
```

### Manuel Deployment

```bash
# 1. Build Docker image
docker build -t gcr.io/YOUR_PROJECT_ID/ecommerce-app .

# 2. Push to Container Registry
docker push gcr.io/YOUR_PROJECT_ID/ecommerce-app

# 3. Deploy to Cloud Run
gcloud run deploy ecommerce-app \
  --image gcr.io/YOUR_PROJECT_ID/ecommerce-app \
  --region europe-west1 \
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
  --set-env-vars GOOGLE_CLOUD_PROJECT="$GOOGLE_CLOUD_PROJECT" \
  --set-env-vars STORAGE_BUCKET="$STORAGE_BUCKET"
```

## 🔄 CI/CD Pipeline (Cloud Build)

### 1. Cloud Build Trigger Oluşturun

```bash
gcloud builds triggers create github \
  --repo-name=YOUR_REPO_NAME \
  --repo-owner=YOUR_GITHUB_USERNAME \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml
```

### 2. Substitutions'ları Ayarlayın

Cloud Build Console'da:
- Triggers > Edit Trigger
- Substitutions bölümünde environment variables'ları ayarlayın

## 📊 Monitoring ve Logging

### 1. Cloud Monitoring

```bash
# Monitoring API'yi etkinleştirin
gcloud services enable monitoring.googleapis.com
```

### 2. Logging

```bash
# Logs'ları görüntüleyin
gcloud logging read "resource.type=cloud_run_revision" --limit=50
```

## 🔒 Güvenlik

### 1. IAM Permissions

```bash
# Cloud Run service account'a gerekli permissions'ları verin
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/storage.objectViewer"
```

### 2. VPC Connector (Opsiyonel)

```bash
# VPC Connector oluşturun (Cloud SQL'e private connection için)
gcloud compute networks vpc-access connectors create ecommerce-connector \
  --region=europe-west1 \
  --range=10.8.0.0/28
```

## 💰 Maliyet Optimizasyonu

### 1. Cloud Run
- Min instances: 0 (trafik yoksa ödeme yok)
- Max instances: 10 (maliyet kontrolü)
- Memory: 1Gi (yeterli performans)

### 2. Cloud SQL
- db-f1-micro: Aylık ~$7
- Backup retention: 7 gün
- Maintenance window: Pazar 03:00

### 3. Cloud Storage
- Standard storage: GB başına ~$0.02/ay
- CDN: Transfer başına ~$0.08/GB

## 🚨 Troubleshooting

### Yaygın Sorunlar

1. **Database Connection Error**
   ```bash
   # Cloud SQL Proxy kullanın
   cloud_sql_proxy -instances=YOUR_INSTANCE_CONNECTION_NAME=tcp:5432
   ```

2. **Permission Denied**
   ```bash
   # Service account permissions'larını kontrol edin
   gcloud projects get-iam-policy YOUR_PROJECT_ID
   ```

3. **Build Failures**
   ```bash
   # Build logs'larını kontrol edin
   gcloud builds log BUILD_ID
   ```

## 📞 Destek

Sorun yaşarsanız:
1. Google Cloud Console > Support
2. Stack Overflow: [google-cloud-platform] tag'i
3. GitHub Issues

---

**Not:** Bu rehber production deployment için temel adımları içerir. Güvenlik ve performans için ek konfigürasyonlar gerekebilir.
