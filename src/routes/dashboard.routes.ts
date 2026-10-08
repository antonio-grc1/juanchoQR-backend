import { Router, Request, Response } from 'express';

const router = Router();

router.get('/ventas/:eventoId', (req: Request, res: Response) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

router.get('/asistencia/:eventoId', (req: Request, res: Response) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

export default router;
