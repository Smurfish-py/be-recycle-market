import express from 'express';
import { getPendingRequests, processRequest } from './request.controller.js';

const router = express.Router();

router.get('/pending', getPendingRequests);
router.put('/:id/process', processRequest);

export default router;