import { Router, Request, Response } from 'express';

const router = Router();

router.post('/google', (req: Request, res: Response) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

router.post('/login', (req: Request, res: Response) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

router.post('/refresh', (req: Request, res: Response) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

router.post('/logout', (req: Request, res: Response) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

export default router;
