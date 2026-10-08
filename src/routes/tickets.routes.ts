import { Router, Request, Response } from 'express';

const router = Router();

router.get('/mis-tickets', (req: Request, res: Response) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

router.post('/validar', (req: Request, res: Response) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

router.post('/emitir', (req: Request, res: Response) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

export default router;
