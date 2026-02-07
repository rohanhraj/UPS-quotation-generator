# ARVI Quotation Generator

Professional PDF quotation generator for ARVI Power UPS products.

## Features

- 📄 Generate professional PDF quotations
- 🎨 Live preview before generating
- 💰 Auto-calculated totals (Subtotal, GST, Grand Total)
- 🔒 Production-ready with security middleware
- 📱 Responsive web interface

## Quick Start

### Prerequisites

- Node.js 18+ 
- Google Chrome (for PDF generation)

### Installation

```bash
# Clone the repository
git clone https://github.com/rohanhraj/UPS-quotation-generator.git
cd UPS-quotation-generator

# Install dependencies
npm install

# Copy environment config
cp .env.example .env

# Start the server
npm start
```

### Access the application

Open http://localhost:3000 in your browser.

## Environment Configuration

Edit `.env` to customize:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `CHROME_PATH` | Chrome executable path | Auto-detected |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Web interface |
| `/health` | GET | Health check |
| `/api/preview` | POST | HTML preview |
| `/api/generate-pdf` | POST | Generate PDF |

## Deployment

### Vercel (Recommended)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. For production:
```bash
vercel --prod
```

The project is configured with `vercel.json` for serverless functions.

### Docker

```dockerfile
FROM node:18-slim
RUN apt-get update && apt-get install -y chromium
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
ENV CHROME_PATH=/usr/bin/chromium
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
```

### Manual Deployment

1. Set `NODE_ENV=production` in `.env`
2. Ensure Chrome is installed
3. Run `npm start`

## License

MIT
