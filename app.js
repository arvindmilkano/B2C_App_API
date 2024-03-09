require('dotenv').config();
const cors = require('cors');
const express = require('express');
const app = express();
const authRoute = require('./routes/admin/auth.routes');
const route = require('./routes/admin/token.routes');
const index = require('./routes/index');
app.use(cors());
app.options('*', cors());

app.use('/public', express.static('public'));

// Load body parser
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb',extended: true}));
// cms api routes

app.use('/api/v1', authRoute);
app.use('/api/v1', index);

app.use('/api/v1/admin', route);
const port = 3000;
app.listen(port, () => console.log(`Listning on port ${port}.....`));

