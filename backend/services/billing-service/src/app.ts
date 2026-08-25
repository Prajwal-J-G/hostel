import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import { json } from 'body-parser';
import { currentUser, errorHandler, NotFoundError } from 'hostel-shared';
import { paymentsRouter } from './routes/payments';

const app = express();

app.use(cors());
app.use(json());

app.use(currentUser);

app.use('/api/billing/payments', paymentsRouter);

app.use((req, res, next) => {
  throw new NotFoundError();
});

app.use(errorHandler);

export { app };
