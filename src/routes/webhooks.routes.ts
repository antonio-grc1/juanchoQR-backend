import { Router, Request, Response } from 'express';

const router = Router();

router.post('/mercadopago', (req: Request, res: Response) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

export default router;
