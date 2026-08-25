import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import { json } from 'body-parser';
import { currentUser, errorHandler, NotFoundError } from 'hostel-shared';
import { communicationsRouter } from './routes/communications';

const app = express();

app.use(cors());
app.use(json());

app.use(currentUser);

app.use('/api/messages', communicationsRouter);

app.use((req, res, next) => {
  throw new NotFoundError();
});

app.use(errorHandler);

export { app };
