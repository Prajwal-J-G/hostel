import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';

dotenv.config();
const app = express();

app.use(cors());

const services = [
  { path: '/api/auth', target: process.env.AUTH_SERVICE_URL || 'http://localhost:5001' },
  { path: '/api/hostels', target: process.env.HOSTEL_SERVICE_URL || 'http://localhost:5002' },
  { path: '/api/rooms', target: process.env.HOSTEL_SERVICE_URL || 'http://localhost:5002' },
  { path: '/api/allocations', target: process.env.ALLOCATION_SERVICE_URL || 'http://localhost:5003' },
  { path: '/api/billing', target: process.env.BILLING_SERVICE_URL || 'http://localhost:5004' },
  { path: '/api/kitchen', target: process.env.KITCHEN_SERVICE_URL || 'http://localhost:5006' }
];

services.forEach((service) => {
  app.use(
    service.path,
    createProxyMiddleware({
      target: service.target,
      changeOrigin: true,
      logLevel: 'debug'
    })
  );
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
});
