const express = require('express');
const app = express();
const PORT = process.env.PORT || 3002;

// JWT đã được gateway kiểm tra (offloading) -> service không verify lại
app.get('/orders/:userId', (req, res) => {
  res.json([
    { id: 1, userId: req.params.userId, product: 'Product A', quantity: 2 },
    { id: 2, userId: req.params.userId, product: 'Product B', quantity: 1 },
  ]);
});

app.listen(PORT, () => console.log(`Order service on ${PORT}`));
