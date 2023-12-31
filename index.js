const express = require('express')
const app = express()
const clientsRouter = require('./routes/client_route')
const qrRouter = require('./routes/qr_route')
const fileUpload = require('express-fileupload');
require('dotenv').config();



app.use(express.json());
app.use(express.urlencoded({
  extended:false
}));
app.use(fileUpload({
  debug: true
}));

app.use('/clients', clientsRouter)
app.use("/", qrRouter)

app.listen(process.env.APP_PORT, () => {
  console.log('Server is listening on port 3000')
})