const express = require('express')
const mysql = require('mysql')
const app = express()
const multer = require("multer");
const upload = multer({ dest: "./public/img" });
const dotenv = require('dotenv');
const path = require('path');
var bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { re, im } = require('mathjs');
var parser = require('fast-xml-parser');
const { compareObjs } = require('fullcalendar');
fetch = require('node-fetch')
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
app.use(express.json({limit: '7mb'}));

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


function convertxml(xml) {
  fetch(`https://api.factmaven.com/xml-to-json?xml=${xml}`)
  .then(response => response.json())
  .then(data => {
    console.log(data)
    return data;
  });
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

app.get('/iaspota', (req, res) => {
  res.render('iaspota')
})

app.get('/test', (req, res) => {
  res.render('upload')
})

app.get('/logger', (req, res) => {
  res.render('logger')
})

app.get('/fdlogger', (req, res) => {
  res.render('fdlogger')
})

app.get('/photos', (req, res) => {
  res.render('photos')
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
  
  try {
    connection.query(`SELECT * from calendar WHERE start >= STR_TO_DATE('${d}', '%Y-%m-%d') AND type ='Lunch Bunch' order by start ASC LIMIT 1`, function (error, results, fields) {
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


// ****************************************************************************************************************************************
// ****                                                  IASPOTA API's                                                                 ****
// ****************************************************************************************************************************************

app.get('/aispotalogs', (req, res) => {
  try {
    connection.query(`SELECT * from iaspota_logs`, function (error, results, fields) {
      if (error) throw error;
      res.send(results);
    });
  }
  catch (exception_var) {
    console.log("Error");
  }
 })

 app.get('/aispotaparks', (req, res) => {
  try {
    connection.query(`SELECT * from iaspota_parks`, function (error, results, fields) {
      if (error) throw error;
      res.send(results);
    });
  }
  catch (exception_var) {
    console.log("Error");
  }
 })

 app.get('/aispotaoperators', (req, res) => {
  try {
    connection.query(`SELECT operator, count(DISTINCT(callsign)) FROM iaspota_logs group by operator order by count(DISTINCT(callsign)) desc limit 5;`, function (error, results, fields) {
      if (error) throw error;
      res.send(results);
    });
  }
  catch (exception_var) {
    console.log("Error");
  }
 })

 app.get('/aispotacount', (req, res) => {
  try {
    connection.query(`SELECT COUNT(*) FROM iaspota_logs count_demos`, function (error, results, fields) {
      if (error) throw error;
      res.send(results);
    });
  }
  catch (exception_var) {
    console.log("Error");
  }
 })

 app.get('/aispotsearch', (req, res) => {
   let park = req.query.park;
  try {
    connection.query(`SELECT * FROM iaspota_logs WHERE park= '${park}'`, function (error, results, fields) {
      if (error) throw error;
      res.send(results);
    });
  }
  catch (exception_var) {
    console.log("Error");
  }
 })


// ****************************************************************************************************************************************
// ****                                          Railroads on the Air API's                                                            ****
// ****************************************************************************************************************************************

  function depotadd(adddepot){
    try {
      connection.query(`INSERT INTO rr_depots SET ? `, {depot: adddepot}, function (error, results, fields) {
      // if (error) throw error;
      return("Depot Added")
    });
    } catch (exception_var) {
    console.log("Error");
    }
  }



app.get('/rrdepots', (req, res) => {
 try {
   connection.query(`SELECT * FROM rr_depots ORDER BY depot ASC`, function (error, results, fields) {
     if (error) throw error;
     res.send(results);
   });
 }
 catch (exception_var) {
   console.log("Error");
 }
})

app.get('/depots', (req, res) => {
  let depot = req.query.depot
  try {
    connection.query(`SELECT * FROM rr_depots WHERE depot = '${depot}'`, function (error, results, fields) {
      if (error) throw error;
        if(results[0] === undefined) {
          try{
            depotadd(req.query.depot)
            res.send('Log was added')
          } catch{
            res.send("Error adding Depot")
          }
        
        } else {
          res.send('')
        }
    });

  }
  catch (exception_var) {
    console.log("Error");
  }
 })

app.get('/rrstats', (req, res) => {
  try {
    let cat = req.body.cat;
    connection.query(`SELECT operator, count(*) as occurrences FROM rr_log GROUP BY operator ORDER BY occurrences DESC LIMIT 3;`, function (error, results, fields) {
      if (error) throw error;
      console.log(results)
      res.send(results);
    });
  }
  catch (exception_var) {
    console.log("Error");
  }
})

app.get('/rrlocations', (req, res) => {
  try {
    let cat = req.body.cat;
    connection.query(`SELECT location, count(*) as occurrences FROM rr_log GROUP BY location ORDER BY occurrences DESC LIMIT 3;`, function (error, results, fields) {
      if (error) throw error;
      console.log(results)
      res.send(results);
    });
  }
  catch (exception_var) {
    console.log("Error");
  }
})

app.get('/rrchaser', (req, res) => {
  try {
    let cat = req.body.cat;
    connection.query(`SELECT callsign, count(*) as occurrences FROM rr_log GROUP BY callsign ORDER BY occurrences DESC LIMIT 3;`, function (error, results, fields) {
      if (error) throw error;
      console.log(results)
      res.send(results);
    });
  }
  catch (exception_var) {
    console.log("Error");
  }
})

app.get('/rrcount', (req, res) => {
  try {
    let cat = req.body.cat;
    connection.query(`SELECT count(*) as total FROM rr_log ;`, function (error, results, fields) {
      if (error) throw error;
      console.log(results)
      res.send(results);
    });
  }
  catch (exception_var) {
    console.log("Error");
  }
})

app.post('/rrlog', (req, res) => {
  let data = req.body;
  let DateNow = new Date().toISOString().substring(0, 10);
  console.log(DateNow)



  for (let i = 0; i < data.length; i++) {
    
    let logcontact = data[i].contact;
    let logdate = data[i].date;
    let logoperator = data[i].operator;
    let logdepot = data[i].depot;
    
    let sqldata = {
      callsign: logcontact,
      date: logdate,
      operator: logoperator,
      location: logdepot
    }
    try {
        connection.query(`INSERT INTO rr_log SET ?`, sqldata, function (error, results, fields) {
          if (error) throw error;
        });
      }
      catch (exception_var) {
        res.send('Error')
        return
      }
  }
    res.send("Logs submitted successfully!");
  // 
 })

 app.get('/rrcalendar', (req, res) => {
    try {
      connection.query(`SELECT * FROM rr_cal`, function (error, results, fields) {
        if (error) throw error;
        res.send(results);
      });
    }
    catch (exception_var) {
      console.log("Error");
    }
 })

 app.post('/rrcal', (req, res) => {
  try {  
   let sqldata = {
      callsign: req.body.callsign,
      date: req.body.date,
      time: req.body.time,
      location: req.body.location,
      band: req.body.band
    }
    connection.query(`INSERT INTO rr_cal SET ?`, sqldata, function (error, results, fields) {
      if (error) throw error;
      res.send(results);
    });
  }
  catch (exception_var) {
    console.log("Error");
  }
 })


// ****************************************************************************************************************************************
// ****                                                 ARES API's                                                                     ****
// ****************************************************************************************************************************************

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
// ****************************************************************************************************************************************
// ****                                                Field Day API's                                                                 ****
// ****************************************************************************************************************************************



        
app.get('/qrzLookUp', (req, res) => {
  let callsign = req.query.callsign
  let band= req.query.band
  let mode = req.query.mode

   fetch("https://xmldata.qrz.com/xml/current/?username=kd9hae;password=ArmY1234$$")
    
    .then(response => response.text())
		.then(keydata => {



          fetch(`https://api.factmaven.com/xml-to-json?xml=${keydata}`)
          .then(response => response.json())
          .then(data => {
           // lookup(data.QRZDatabase.Session.Key)

           
            fetch(`https://xmldata.qrz.com/xml/current/?s=${data.QRZDatabase.Session.Key};callsign=${callsign}`)
            .then(response => response.text())
            .then(dbdata => {
              fetch(`https://api.factmaven.com/xml-to-json?xml=${dbdata}`)
              .then(response => response.json())
              .then(logdata => {
                let type = 'New'
                try {
                  connection.query(`SELECT * FROM logs WHERE callsign='${callsign}' AND band='${band}' AND mode='${mode}' AND year='2021'`, function (error, results, fields) {
                    if (error) throw error;
                    if(!results.length) {
                      type = 'New'
                    } else {
                      type = 'Duplicate'
                    }
                  });
                }
                catch (exception_var) {
                  console.log("Error");
                }




                //console.log(logdata)
                let calldata = {
                  lat: logdata.QRZDatabase.Callsign.lat,
                  lng: logdata.QRZDatabase.Callsign.lon,
                  class: logdata.QRZDatabase.Callsign.state,
                  name: logdata.QRZDatabase.Callsign.name_fmt,
                  image : logdata.QRZDatabase.Callsign.image,
                  type: type,
                }
                
                res.send(JSON.stringify(calldata))
              });
            });
          });
	  	});
    });
     


// ****************************************************************************************************************************************
// ****                                              Image Gallery API's                                                               ****
// ****************************************************************************************************************************************


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

 app.get('/gallery', (req, res) => {
  let type = req.query.type;
  try {
    connection.query(`SELECT * from images WHERE active='Yes' order by id DESC`, function (error, results, fields) {
      if (error) throw error;
      res.send(results);
    });
  }
  catch (exception_var) {
    console.log("Error");
  }
 })

 app.get('/gallerydetails', (req, res) => {
  let id = req.query.id;
  try {
    connection.query(`SELECT * from images WHERE id = '${id}'`, function (error, results, fields) {
      if (error) throw error;
      res.send(results);
    });
  }
  catch (exception_var) {
    console.log("Error");
  }
 })

 app.post('/images', (req, res) => {
  let image = req.body;
  try {
    connection.query(`INSERT INTO images SET ?`, image, function (error, results, fields) {
      if (error) throw error;
      res.send('Success');
    });
  }
  catch (exception_var) {
    console.log("Error");
  }
 })

 app.get('/slideshow', (req, res) => {
  try {
    connection.query(`SELECT * from images WHERE active='Yes' AND frontpage = 'Yes' order by id DESC`, function (error, results, fields) {
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