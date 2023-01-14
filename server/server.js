
const express = require('express');
const app = express()
const bodyParser = require("body-parser");
const port = 3080;
const dotenv = require('dotenv');
const path = require('path');
dotenv.config();

const axios = require('axios')
var cors = require('cors')
app.use(cors())
// place holder for the data
app.use(bodyParser.json());

app.get('/categories', (req, res) => {
  axios.get(`https://secure.splitwise.com/api/v3.0/get_categories`,{
        headers :{
          Authorization: `Bearer ${process.env.REACT_APP_SPLITWISE_API_KEY}`
        }
      }).then(({data}) => {
          return res.status(200).send(data)
        })
      .catch(err => {
          return res.status(500).send(err)
        })
});

app.post('/expenses', (req, res) => {
    axios.post(`https://secure.splitwise.com/api/v3.0/create_expense`,req.body,{
          headers :{
            Authorization: `Bearer ${process.env.REACT_APP_SPLITWISE_API_KEY}`
          }
        }).then(({data}) => {
            return res.status(200).send(data)
          })
        .catch(err => {
            return res.status(500).send(err)
          })
});

app.get('/expenses', (req, res) => {
  axios.post(`https://secure.splitwise.com/api/v3.0/get_expenses${req.params}`, {
        headers :{
          Authorization: `Bearer ${process.env.REACT_APP_SPLITWISE_API_KEY}`
        }
      }).then(({data}) => {
          return res.status(200).send(data)
        })
      .catch(err => {
          console.log(err.message);
          return res.status(500).send(err)
        })
});

app.use('/app', express.static(path.join(__dirname, '../client/build')))
app.use(express.static(path.join(__dirname, '../client/build')))
app.get('/', function (req, res, next) {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});


app.listen(port, () => {
    console.log(`Server listening on the port::${port}`);
});