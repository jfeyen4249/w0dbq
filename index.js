const express = require('express')
const mysql = require('mysql')
const app = express()
const dotenv = require('dotenv');
const path = require('path');
var bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { re, im } = require('mathjs');
const { compareObjs, collectFromHash } = require('fullcalendar');
dotenv.config({ path: './.env'});
const fs = require('fs');
const port = 80;
const multer = require('multer');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/img/'); // Destination folder where files will be stored
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname); // File name will be unique
  }
});

const upload = multer({ storage: storage });

var connection = mysql.createConnection({
    host     : process.env.db_host,
    user     : process.env.db_user,
    password : process.env.db_password,
    database : process.env.db_database
  });
connection.connect();

app.set('view engine', 'handlebars')
app.set('view engine', 'hbs');
app.use(express.static(path.join(__dirname, './public')));
app.use(express.urlencoded({extended: false}));
app.use(express.json({limit: '7mb'}));

function authenticateToken(req, res, nex) {
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
    return data;
  });
}


//  ****************************************
// ****************************************
// ****        User Functions          ****
// ****************************************
// ****************************************
app.post('/register', async (req, res) => {
  try {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(req.body.password, salt)
    let userdata = {callsign: req.body.callsign, password: hashedPassword, name:req.body.name, email:req.body.email, admin: 'No', status: 'Pending'}
      connection.query(`SELECT callsign FROM users WHERE callsign=${connection.escape(req.body.callsign)}`, function (error, results, fields) {
        if (error) throw error;
          if(results == "") {
            connection.query('INSERT INTO users SET ?', userdata, function (error, results, fields) {
              if (error) throw error;
              res.send("registered");
            });
          }else {
            
            res.send(`Username ${req.body.callsign} is already registered!`);
          }
      });
    }
    catch (exception_var) {
      console.log(exception_var)
    }

})

app.post('/login', async (req, res) => {
const callsign = {callsign: req.body.callsign}
const accesstoken = jwt.sign(callsign, process.env.jwt_secret)
try {
  connection.query(`SELECT * FROM users WHERE callsign='${req.body.callsign}'`, function (error, results, fields) {
    //if (error) throw error;
    if(results == "") {
      res.send({status: "Incorrect username or password!"})
    } else {

      bcrypt.compare(req.body.password, results[0].password, function(err, isMatch) {
        if (err) {
          throw err
        } else if (!isMatch) {
          res.send({status: "Incorrect username or password!"})
          // console.log("fail")
        } else {  
          connection.query(`SELECT status FROM users Where callsign='${req.body.callsign}'`, function (error, statusresults, fields) {            
            if(statusresults[0].status == 'Active') {
              res.send({status: "pass", callsign: req.body.callsign, token: accesstoken})
            } else {
              res.send({status: `Your account status: ${statusresults[0].status}`})
              // console.log("pass")
            }
          })
         }
      })
    }
  });
}
catch (exception_var) {
  //console.log("error")
}

})

app.get('/auth', authenticateToken, (req, res) => {
  res.send('authorized')
})

app.post('/bodmembers', authenticateToken, (req, res) => {
  let id =  req.query.id
  try {
    connection.query(`UPDATE bod SET name='${req.body.name}', callsign='${req.body.callsign}', image='${req.body.image}' WHERE id='${id}'`, function (error, results, fields) {
      if (error) throw error;
      console.log(results)
      res.send(results);

    });
  }
  catch (exception_var) {
    console.log("Error" + exception_var);
  }
})


app.get('/adminauth', (req, res) => {
  const authHeader = req.headers['authorization']
  const token = authHeader &&  authHeader.split(' ')[1]
  if(token == null) return res.sendStatus(401);
  jwt.verify(token, process.env.jwt_secret, (err, user) => {
    if(err) return res.sendStatus(403)
    req.user = user
    try {
      connection.query(`SELECT admin FROM users WHERE callsign = '${user.callsign}'`, function (error, results, fields) {
        if (error) throw error;
        res.send(results[0].admin);
  
      });
    }
    catch (exception_var) {
      console.log("Error" + exception_var);
    }
  })
})

app.get('/mediaauth', (req, res) => {
  const authHeader = req.headers['authorization']
  const token = authHeader &&  authHeader.split(' ')[1]
  if(token == null) return res.sendStatus(401);
  jwt.verify(token, process.env.jwt_secret, (err, user) => {
    if(err) return res.sendStatus(403)
    req.user = user
    try {
      connection.query(`SELECT photos FROM users WHERE callsign = '${user.callsign}'`, function (error, results, fields) {
        if (error) throw error;
        res.send(results[0].photos);
  
      });
    }
    catch (exception_var) {
      console.log("Error" + exception_var);
    }
  })
})


app.get('/users', authenticateToken, (req, res) => {

  try {
    connection.query(`Select * From users`, function (error, results, fields) {
      if (error) throw error;
      res.send(results);
    });
  }
  catch (exception_var) {
    console.log("Error");
  }
 })

 app.post('/userstatus', authenticateToken, (req, res) => {
  function statuscheck(status) {
    if(status == "Pending" || status == "Disabled") {
      return "Active"
    } else {
      return "Disabled"
    }
  }
  try {
    connection.query(`Select status From users WHERE id='${req.body.userid}'`, function (error, results, fields) {
      if (error) throw error;
      try {
        connection.query(`UPDATE users SET status = '${statuscheck(results[0].status)}' WHERE id='${req.body.userid}'`, function (error1, results1, fields) {
          if (error1) throw error1;
            console.log(results1)
          
          
        });
      }
      catch (exception_var) {
        console.log("Error");
      }
    
      
    });
  }
  catch (exception_var) {
    console.log("Error");
  }
 })

 app.post('/userright', authenticateToken, (req, res) => {
  function userright(status) {
    if (status == "No" || status == "") {
      return "Yes";
    } else {
      return "No";
    }
  }

  try {
    const userRightField = req.body.userright; // Store the userRight field name

    connection.query(`SELECT ${userRightField} FROM users WHERE id='${req.body.userid}'`, function (error, results, fields) {
      if (error) throw error;
      try {
        connection.query(`UPDATE users SET ${userRightField} = '${userright(results[0][userRightField])}' WHERE id='${req.body.userid}'`, function (error1, results1, fields) {
          if (error1) throw error1;
          console.log(results1)
        });
      } catch (exception_var) {
        console.log("Error");
      }
    });
  } catch (exception_var) {
    console.log("Error");
  }
});













// ****************************************
// ****************************************
// ****     Public Rendering Pages     ****
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

app.get('/videos', (req, res) => {
  res.render('videos')
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


app.get('/logger', (req, res) => {
  res.render('logger')
})

app.get('/fdlogger', (req, res) => {
  res.render('fdlogger')
})

app.get('/photos', (req, res) => {
  res.render('photos')
})

app.get('/upload', (req, res) => {
  res.render('upload')
})

app.get('/managephotos', (req, res) => {
  res.render('managephotos')
})


app.get('/test', (req, res) => {
  res.render('test')
})


// ****************************************
// ****************************************
// ****    Members Rendering Pages     ****
// ****************************************
// ****************************************


app.get('/admin',(req, res) => {
  res.render('admin')
})

app.get('/login', (req, res) => {
  res.render('login')
})

app.get('/signup', (req, res) => {
  res.render('signup')
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

 app.get('/bodmembers', (req, res) => {
 
  try {
    connection.query(`SELECT * from bod`, function (error, results, fields) {
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

//  app.post('/uploadmedia', upload.array('files'), (req, res) => {
//   // Access the uploaded files via req.files array
//   function mediatype(mime) {
//     if(mime == "jpeg"){
//       return "image"
//     } else if(mime == "mp4") {
//       return "video"
//     }
//   }
  
//   for(let i=0; i < req.files.length; i++){
//     let filetype = req.files[i].mimetype.split('/')
    
//     try {
//       let sqldata = {
//         url: `/img/${req.files[i].filename}`,
//         active: 'New',
//         frontpage: 'No',
//         filetype: mediatype(filetype[1])
//       }
//       connection.query(`INSERT INTO images SET ?`, sqldata, function (error, results, fields) {
//         if (error) throw error;

//       });
//     }
//     catch (exception_var) {
//       console.log("Error");
//     }
//   }
//   res.status(200).send('Files uploaded successfully');
// });

app.post('/uploadmedia', upload.array('files'), (req, res) => {
  function mediatype(mime) {
    if (mime == "jpeg") {
      return "image";
    } else if (mime == "mp4") {
      return "video";
    }
  }

  const promises = req.files.map((file) => {
    return new Promise((resolve, reject) => {
      const filetype = file.mimetype.split('/');
      const sqldata = {
        url: `/img/${file.filename}`,
        active: 'New',
        frontpage: 'No',
        filetype: mediatype(filetype[1])
      };
      connection.query(`INSERT INTO images SET ?`, sqldata, function (error, results, fields) {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  });

  Promise.all(promises)
    .then(() => {
      res.render('upload')
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send('An error occurred during file upload');
    });
});

app.get('/uploadmedia', authenticateToken, (req, res) => {
  let type = req.query.type;
  function mediatype(mime) {
    if (mime == "jpeg") {
      return "image";
    } else if (mime == "mp4") {
      return "video";
    }
  }

  try {
    connection.query(`SELECT * FROM images WHERE active = '${type}' Order by id desc`, function (error, results, fields) {
      if (error) throw error;
      res.send(results);
    });
  }
  catch (exception_var) {
    console.log("Error");
  }

});

app.put('/uploadmedia', authenticateToken, (req, res) => {
  let id = req.query.id
  console.log(req.body)
  try {
    connection.query(`UPDATE images SET ? Where id = '${id}'`, req.body, function (error, results, fields) {
      if (error) throw error;
      res.send('Updated');
    });
  }
  catch (exception_var) {
    console.log("Error");
  }

});

app.delete('/uploadmedia', authenticateToken, (req, res) => {
  let id = req.query.id
  try {
    connection.query(`UPDATE images SET active = 'No' WHERE id= '${id}'`, function (error, results, fields) {
      if (error) throw error;
      res.send('Deleted');
    });
  }
  catch (exception_var) {
    console.log("Error");
  }

});




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

 app.get('/bodimages', (req, res) => {
  const imageFolder = path.join(__dirname);
  fs.readdir(imageFolder, (err, files) => {
    if (err) {
      console.error(err);
      res.status(500).send('Server error');
      return;
    }

    const images = files.filter(file => {
      const ext = path.extname(file);
      return ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.gif';
    });

    res.json(images);
  });
});

app.get('/files', (req, res) => {
  const fileFolder = path.join(__dirname, '/public/img/bod');
  fs.readdir(fileFolder, (err, files) => {
    if (err) {
      console.error(err);
      res.status(500).send('Server error');
      return;
    }
    res.json(files);
  });
});

app.post('/bodupload', (req, res) => {
  const photoData = req.body.photo;

  // decode base64 data into binary data
  const binaryData = Buffer.from(photoData, 'base64');

  // generate a unique filename for the photo
  const filename = Date.now() + '.jpg';

  // set the path where the photo will be saved
  const imagePath = path.join(__dirname, '/public/img/bod/', filename);

  // write binary data to file
  fs.writeFile(imagePath, binaryData, (err) => {
    if (err) {
      console.error(err);
      res.status(500).send('Failed to upload photo');
    } else {
      res.send('Photo uploaded successfully');
    }
  });
});

app.get('/lbdates', (req, res) => {
  let image = req.body;
  try {
    connection.query(`SELECT * FROM calendar WHERE start >= DATE_ADD(CURDATE(), INTERVAL (7 - WEEKDAY(CURDATE())) DAY)   AND start <= DATE_ADD(CURDATE(), INTERVAL (7 - WEEKDAY(CURDATE())) + 6 * 7 DAY)`, function (error, results, fields) {
      if (error) throw error;
      res.send(results);
    });
  }
  catch (exception_var) {
    console.log("Error");
  }
 })

 app.get('/lblist', (req, res) => {
  
  try {
    connection.query(`SELECT * FROM lunch_locations Order BY location Asc`, function (error, results, fields) {
      if (error) throw error;
      res.send(results);
    });
  }
  catch (exception_var) {
    console.log("Error");
  }
 })

 app.get('/lblistdetail', (req, res) => {
  let location = req.query.location;
  try {
    connection.query(`SELECT * FROM lunch_locations Where location='${location}'`, function (error, results, fields) {
      if (error) throw error;
      res.send(results);
    });
  }
  catch (exception_var) {
    console.log("Error");
  }
 })

 app.post('/lblistupdate', authenticateToken,  (req, res) => {
  try {
    connection.query(`UPDATE lunch_locations SET location='${req.body.location}', address='${req.body.address}' Where id='${req.body.id}'`, function (error, results, fields) {
      if (error) throw error;
      res.send(results);
    });
  }
  catch (exception_var) {
    console.log("Error");
  }
 })

 app.post('/addloc', authenticateToken,  (req, res) => {
  try {
    connection.query(`INSERT INTO lunch_locations SET ?`, req.body, function (error, results, fields) {
      if (error) throw error;
      console.log(results)
      res.send(results);
    });
  }
  catch (exception_var) {
    console.log("Error");
  }
 })
 
 app.post('/lbupdatecalloc', authenticateToken,  (req, res) => {
  try {
    connection.query(`SELECT * FROM lunch_locations WHERE location='${req.body.location}'`, function (error, results, fields) {
      if (error) throw error;
      
      try {
        let caldesc = results[0].location + ' ' + results[0].address
        //console.log(`UPDATE calendar SET description='${caldesc}', location='${results[0].location}', address='${results[0].address}' WHERE id='${results[0].id}'`)
        connection.query(`UPDATE calendar SET description='${caldesc}', location='${results[0].location}', address='${results[0].address}' WHERE id='${req.body.id}'`, function (error1, results1, fields1) {
          if (error1) throw error1;
         //console.log(results1)
          res.send(results1)
        });
      }
      catch (exception_var) {
        console.log("Error");
      }



    });
  }
  catch (exception_var) {
    console.log("Error");
  }





 })



























app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})