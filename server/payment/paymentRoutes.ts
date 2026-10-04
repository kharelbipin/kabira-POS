import express, { Request, Response } from 'express';
import { getAuthUser } from '../authSession.js';
import { paymentService } from './PaymentService.js';

export const paymentRouter = express.Router();

function ids(req: Request) {
  return {
    storeId: String(req.query.storeId || req.body?.storeId || 'store-1'),
    registerId: String(req.query.registerId || req.body?.registerId || 'reg-01'),
  };
}

paymentRouter.use((req, res, next) => {
  try {
    (req as any).paymentUser = getAuthUser(req);
    next();
  } catch {
    res.status(401).json({ error: 'Authentication required for payments.' });
  }
});

paymentRouter.get('/config', (req: Request, res: Response) => {
  const { storeId, registerId } = ids(req);
  res.json(paymentService.getConfig(storeId, registerId));
});

paymentRouter.put('/config', (req: Request, res: Response) => {
  const user = (req as any).paymentUser;
  if (!['Admin', 'Manager'].includes(user.role)) {
    return res.status(403).json({ error: 'Manager or Admin access required.' });
  }
  const { storeId, registerId } = ids(req);
  res.json(paymentService.saveConfig({ ...req.body, storeId, registerId }));
});

paymentRouter.get('/status', async (req: Request, res: Response) => {
  const { storeId, registerId } = ids(req);
  res.json(await paymentService.status(storeId, registerId));
});

paymentRouter.post('/connect', async (req: Request, res: Response) => {
  const { storeId, registerId } = ids(req);
  res.json(await paymentService.connect(storeId, registerId));
});

paymentRouter.post('/sale', async (req: Request, res: Response) => {
  try {
    const user = (req as any).paymentUser;
    const tx = await paymentService.sale({
      ...req.body,
      cashierId: user.id,
      cashierName: user.name,
    });
    res.json(tx);
  } catch (error: any) {
    res.status(400).json({ error: error?.message || 'Payment sale failed.' });
  }
});

paymentRouter.post('/refund', async (req: Request, res: Response) => {
  try {
    const user = (req as any).paymentUser;
    if (!['Admin', 'Manager'].includes(user.role)) {
      return res.status(403).json({ error: 'Manager or Admin access required.' });
    }
    res.json(await paymentService.refund({
      ...req.body,
      cashierId: user.id,
      cashierName: user.name,
    }));
  } catch (error: any) {
    res.status(400).json({ error: error?.message || 'Payment refund failed.' });
  }
});

paymentRouter.post('/void', async (req: Request, res: Response) => {
  try {
    const user = (req as any).paymentUser;
    if (!['Admin', 'Manager'].includes(user.role)) {
      return res.status(403).json({ error: 'Manager or Admin access required.' });
    }
    res.json(await paymentService.void({
      ...req.body,
      cashierId: user.id,
      cashierName: user.name,
    }));
  } catch (error: any) {
    res.status(400).json({ error: error?.message || 'Payment void failed.' });
  }
});

paymentRouter.post('/cancel', async (req: Request, res: Response) => {
  const { storeId, registerId } = ids(req);
  await paymentService.cancel(storeId, registerId, req.body?.transactionId);
  res.json({ success: true });
});

paymentRouter.get('/transactions', (req: Request, res: Response) => {
  const { storeId, registerId } = ids(req);
  res.json(paymentService.listTransactions(storeId, registerId));
});
