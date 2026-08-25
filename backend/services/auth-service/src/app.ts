import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import { json } from 'body-parser';
import { currentUser, errorHandler, NotFoundError } from 'hostel-shared';
import { registerRouter } from './routes/register';
import { loginRouter } from './routes/login';
import { currentUserRouter } from './routes/current-user';

const app = express();

app.use(cors());
app.use(json());

app.use(currentUser);

// API routes prefix
app.use('/api/auth/register', registerRouter);
app.use('/api/auth/login', loginRouter);
app.use('/api/auth/me', currentUserRouter);

// Fallback for unmatched routes
app.use((req, res, next) => {
  throw new NotFoundError();
});

app.use(errorHandler);

export { app };
