import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

router.get('/:id', (req: Request, res: Response) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

router.post('/', (req: Request, res: Response) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

router.put('/:id', (req: Request, res: Response) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

router.delete('/:id', (req: Request, res: Response) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

export default router;
