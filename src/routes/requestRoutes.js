import express from 'express';
import { getPendingRequests, processRequest } from './request.controller.js';

const router = express.Router();

// GET /api/requests/pending -> Mengambil semua data yang PENDING
router.get('/pending', getPendingRequests);

// PUT /api/requests/:id/process -> Memproses DISETUJUI / DITOLAK
router.put('/:id/process', processRequest);

export default router;