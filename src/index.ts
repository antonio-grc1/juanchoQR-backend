import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.routes.js';
import eventosRoutes from './routes/eventos.routes.js';
import ordenesRoutes from './routes/ordenes.routes.js';
import ticketsRoutes from './routes/tickets.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import webhooksRoutes from './routes/webhooks.routes.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/eventos', eventosRoutes);
app.use('/api/ordenes', ordenesRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/webhooks', webhooksRoutes);

app.use(errorHandler);

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
