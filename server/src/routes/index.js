const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const categoryRoutes = require('./categoryRoutes');
const productRoutes = require('./productRoutes');
const orderRoutes = require('./orderRoutes');
const paymentRoutes = require('./paymentRoutes');
const riderRoutes = require('./riderRoutes');
const receiptRoutes = require('./receiptRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const logRoutes = require('./logRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/riders', riderRoutes);
router.use('/receipts', receiptRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/logs', logRoutes);

module.exports = router;
