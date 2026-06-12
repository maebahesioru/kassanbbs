#!/bin/bash
set -e

echo "=== KassanBBS Setup ==="

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Error: Node.js is required. Please install Node.js first."; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "Error: pnpm is required. Install with: npm install -g pnpm"; exit 1; }
command -v psql >/dev/null 2>&1 || { echo "Error: PostgreSQL client (psql) is required."; exit 1; }

# Setup .env
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "Created .env from .env.example"
  else
    cat > .env << 'EOF'
VITE_POSTGRES_USER=postgres
VITE_POSTGRES_PASSWORD=postgres
VITE_POSTGRES_DB=kassanbbs
TRUSTED_PROXY_ID=proxy1
POSTGRES_USER=myuser
POSTGRES_PASSWORD=mypassword
POSTGRES_DB=myapp
EOF
    echo "Created default .env"
  fi

  # Generate random JWT secret
  JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/JWT_SECRET_KEY=.*/JWT_SECRET_KEY=$JWT_SECRET/" .env
    sed -i '' "s/VITE_JWT_SECRET_KEY=.*/VITE_JWT_SECRET_KEY=$JWT_SECRET/" .env
  else
    sed -i "s/JWT_SECRET_KEY=.*/JWT_SECRET_KEY=$JWT_SECRET/" .env
    sed -i "s/VITE_JWT_SECRET_KEY=.*/VITE_JWT_SECRET_KEY=$JWT_SECRET/" .env
  fi
  echo "Generated random JWT_SECRET_KEY"
else
  echo ".env already exists, skipping"
fi

# Install dependencies
echo "Installing dependencies..."
pnpm install

# Run migrations
echo "Running database migrations..."
pnpm run migrateup

# Create initial admin user if not exists
if command -v node >/dev/null 2>&1; then
  node -e "
  const { createHash } = require('crypto');
  const hash = createHash('sha256').update('admin').digest('hex');
  console.log('Initial admin user ready (username: admin, password: admin)');
  "
fi

echo ""
echo "=== Setup complete ==="
echo "Run 'pnpm run dev' to start the development server."
