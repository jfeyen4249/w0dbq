const express = require('express')
const mysql = require('mysql')
const app = express()
const multer = require("multer");
const upload = multer({ dest: "./public/img" });
const fs = require('fs');
const dotenv = require('dotenv');
const path = require('path');
var bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken')
dotenv.config({ path: './.env'});
const port = 80;


var connection = mysql.createConnection({
    host     : process.env.db_host,
    user     : process.env.db_user,
    password : process.env.db_password,
    database : process.env.db_database
  });
connection.connect();

app.set('view engine', 'handlebars')
app.set('view engine', 'hbs');
const publicDirectory = path.join(__dirname, './public');
app.use(express.static(publicDirectory));
app.use(express.urlencoded({extended: false}));
app.use(express.json());

function authenticateTocken(req, res, nex) {
  const authHeader = req.headers['authorization']
  const token = authHeader &&  authHeader.split(' ')[1]
  if(token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.jwt_secret, (err, user) => {
    if(err) return res.sendStatus(403)
    req.user = user
    nex()
  })
}


// ****************************************
// ****************************************
// ****       Rendering Pages          ****
// ****************************************
// ****************************************

app.get('/', (req, res) => {
  res.render('index')
})

app.get('/rr', (req, res) => {
  res.render('railroad')
})

app.get('/ares', (req, res) => {
  res.render('ares')
})

app.get('/zoom', (req, res) => {
  res.render('zoom')
})

app.get('/calendar', (req, res) => {
  res.render('calendar')
})

app.get('/bod', (req, res) => {
  res.render('bod')
})

app.get('/about', (req, res) => {
  res.render('about')
})


// ****************************************
// ****************************************
// ****           API Calls            ****
// ****************************************
// ****************************************

app.get('/getevent', (req, res) => {
  let id = req.query.id;
  try {
    connection.query(`SELECT description from calendar WHERE id=${id}`, function (error, results, fields) {
      if (error) throw error;
      console.log(results)
      res.send(results);
    });
  }
  catch (exception_var) {
    console.log("Error");
  }
})

app.get('/getcalendar', (req, res) => {
  try {
    connection.query(`SELECT * from calendar`, function (error, results, fields) {
      if (error) throw error;
      console.log(results)
      res.send(results);
    });
  }
  catch (exception_var) {
    console.log("Error");
  }
})

app.get('/lunch', (req, res) => {
  let d = new Date().toISOString();
  d =  d.substring(0,10)
  console.log(d)
                          //                            <= STR_TO_DATE('2013-09-08', '%Y-%m-%d')
  try {
    connection.query(`SELECT * from calendar WHERE start >= STR_TO_DATE('${d}', '%Y-%m-%d') AND type ='Lunch Bunch' order by start ASC`, function (error, results, fields) {
      if (error) throw error;
    
      res.send(results);
    });
  }
  catch (exception_var) {
    console.log("Error");
  }
 })

app.get('/testing', (req, res) => {
  let d = new Date().toISOString();
  d =  d.substring(0,10)
  try {
    connection.query(`SELECT start from calendar WHERE start >= STR_TO_DATE('${d}', '%Y-%m-%d') AND type ='Testing' order by start ASC LIMIT 1`, function (error, results, fields) {
      if (error) throw error;
    
      res.send(results);
    });
  }
  catch (exception_var) {
    console.log("Error");
  }
 })

 app.get('/zoommeeting', (req, res) => {
  let d = new Date().toISOString();
  d =  d.substring(0,10)
  try {
    connection.query(`SELECT * from zoom WHERE date >= STR_TO_DATE('${d}', '%Y-%m-%d') order by date ASC LIMIT 1`, function (error, results, fields) {
      if (error) throw error;
      res.send(results);
    });
  }
  catch (exception_var) {
    console.log("Error");
  }
 })

 app.get('/arescontrolers', (req, res) => {
  let d = new Date().toISOString();
  d =  d.substring(0,10)
  try {
    connection.query(`SELECT * from ares_netcontrol WHERE date >= STR_TO_DATE('${d}', '%Y-%m-%d') order by date ASC LIMIT 4`, function (error, results, fields) {
      if (error) throw error;
      res.send(results);
    });
  }
  catch (exception_var) {
    console.log("Error");
  }
 })

 app.get('/arescontrol', (req, res) => {
  let d = new Date().toISOString();
  d =  d.substring(0,10)
  try {
    connection.query(`SELECT * from ares_netcontrol WHERE date STR_TO_DATE('${d}', '%Y-%m-%d') order by date ASC LIMIT 1`, function (error, results, fields) {
      if (error) throw error;
      res.send(results);
    });
  }
  catch (exception_var) {
    console.log("Error");
  }
 })

 app.get('/images', (req, res) => {
  let type = req.query.type;
  try {
    connection.query(`SELECT * from images WHERE active='Yes' AND type = '${type}' order by id DESC`, function (error, results, fields) {
      if (error) throw error;
      res.send(results);
    });
  }
  catch (exception_var) {
    console.log("Error");
  }
 })

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})