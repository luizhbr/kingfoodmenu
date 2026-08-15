import { Router } from 'express';
import { checkDeliveryAddress } from '../controllers/delivery-zone.controller.js';

const router = Router();

router.post('/zones/check', checkDeliveryAddress);

export default router;
