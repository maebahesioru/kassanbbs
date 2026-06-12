Write-Host "=== KassanBBS Setup ===" -ForegroundColor Cyan

# Check prerequisites
$nodeCheck = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCheck) {
  Write-Host "Error: Node.js is required. Please install Node.js first." -ForegroundColor Red
  exit 1
}

$pnpmCheck = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $pnpmCheck) {
  Write-Host "Error: pnpm is required. Install with: npm install -g pnpm" -ForegroundColor Red
  exit 1
}

$psqlCheck = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlCheck) {
  Write-Host "Warning: PostgreSQL client (psql) not found. Make sure PostgreSQL is running." -ForegroundColor Yellow
}

# Setup .env
if (-not (Test-Path ".env")) {
  if (Test-Path ".env.example") {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example" -ForegroundColor Green
  } else {
@"
VITE_POSTGRES_USER=postgres
VITE_POSTGRES_PASSWORD=postgres
VITE_POSTGRES_DB=kassanbbs
TRUSTED_PROXY_ID=proxy1
POSTGRES_USER=myuser
POSTGRES_PASSWORD=mypassword
POSTGRES_DB=myapp
"@ | Set-Content ".env"
    Write-Host "Created default .env" -ForegroundColor Green
  }

  # Generate random JWT secret
  $jwtSecret = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  $envContent = Get-Content ".env" -Raw
  $envContent = $envContent -replace 'JWT_SECRET_KEY=.*', "JWT_SECRET_KEY=$jwtSecret"
  $envContent = $envContent -replace 'VITE_JWT_SECRET_KEY=.*', "VITE_JWT_SECRET_KEY=$jwtSecret"
  Set-Content ".env" -Value $envContent
  Write-Host "Generated random JWT_SECRET_KEY" -ForegroundColor Green
} else {
  Write-Host ".env already exists, skipping" -ForegroundColor Yellow
}

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Cyan
pnpm install
if ($LASTEXITCODE -ne 0) {
  Write-Host "Failed to install dependencies" -ForegroundColor Red
  exit 1
}

# Run migrations
Write-Host "Running database migrations..." -ForegroundColor Cyan
pnpm run migrateup
if ($LASTEXITCODE -ne 0) {
  Write-Host "Migration failed. Make sure PostgreSQL is running and .env is configured correctly." -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "=== Setup complete ===" -ForegroundColor Cyan
Write-Host "Run 'pnpm run dev' to start the development server." -ForegroundColor Green
