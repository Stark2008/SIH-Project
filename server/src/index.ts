import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ENV, validateEnv } from './config/env';

dotenv.config();
validateEnv();

const app = express();
const port = ENV.PORT;

import authRoutes from './routes/auth';
import produceRoutes from './routes/produce';
import requirementRoutes from './routes/requirements';
import orderRoutes from './routes/orders';
import matchRoutes from './routes/matches';
import paymentRoutes from './routes/payments';
import escrowRoutes from './routes/escrow';

app.use(cors({
  origin: ENV.CORS_ORIGINS
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/produce', produceRoutes);
app.use('/api/requirements', requirementRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/escrow', escrowRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

export default app;
