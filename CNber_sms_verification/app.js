
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const smsRoutes = require('./routes/sms');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use('/api/sms', smsRoutes);

app.listen(port, () => {
    console.log(`CNber SMS Server running on http://localhost:${port}`);
});
