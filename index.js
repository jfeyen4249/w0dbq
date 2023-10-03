const express = require("express");
const mysql = require("mysql");
const app = express();
const dotenv = require("dotenv");
const path = require("path");
var bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
dotenv.config({ path: "./.env" });
const fs = require("fs");
const port = 80;
const multer = require("multer");
const axios = require("axios");
const { Buffer } = require("buffer");
const https = require("https");
const { books } = require("googleapis/build/src/apis/books");
const PDFDocument = require('pdfkit');
const pdf = require('html-pdf');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/img/"); // Destination folder where files will be stored
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname); // File name will be unique
  },
});

const upload = multer({ storage: storage });

var connection = mysql.createConnection({
  host: process.env.db_host,
  user: process.env.db_user,
  password: process.env.db_password,
  database: process.env.db_database,
});
connection.connect();

function generateRandomString(length, seed) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = '';

  for (let i = 0; i < length; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      const randomIndex = Math.floor(seed / 233280 * characters.length);
      randomString += characters.charAt(randomIndex);
  }

  return randomString;
}

app.set("view engine", "handlebars");
app.set("view engine", "hbs");
app.use(express.static(path.join(__dirname, "./public")));
app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: "7mb" }));

function getCurrentDateTime() {
  const now = new Date();
  
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  
  const formattedDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  
  return formattedDateTime;
}

function authenticateToken(req, res, nex) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);
  jwt.verify(token, process.env.jwt_secret, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    nex();
  });
}



//  **********************************************************************************************************************
// ***********************************************************************************************************************
// ****************************************       Send Email Functions          ******************************************
// ***********************************************************************************************************************
// ***********************************************************************************************************************

function sendEmail(toAddress, subject, bodyText) {
    let emaildata = {
      toAddress: toAddress,
      subject: subject,
      body: bodyText,
      status: 'Unsent'
    }

    try {
      connection.query(`INSERT INTO messages SET ? `, emaildata , function (error, results, fields) {
        if (error) throw error;
        console.log(results)
      });
    } catch (exception_var) {
      console.log("Error");
    }
}

app.get("/email", (req, res) => {
  const authHeader = req.headers.authorization;
  const auth = authHeader.split(' ')[1];
  console.log(auth)

  if(auth !== process.env.mail_auth) {
    res.send({status: 'Error!'})
    return
  }

  try {
    connection.query(`SELECT * FROM messages WHERE status = 'unsent'`, function (error, results, fields) {
      if (error) throw error;
      res.send(results)
    });
  } catch (exception_var) {
    console.log("Error");
  }
});

app.post("/email", (req, res) => {
  const authHeader = req.headers.authorization;
   const auth = authHeader.split(' ')[1];
   const id = req.body.id
  console.log(authHeader)

  if(auth !== process.env.mail_auth) {
    res.send({status: 'Error!'})
    return
  }

  try {
    connection.query(`UPDATE messages SET status = 'sent' WHERE id=${id}`, function (error, results, fields) {
      if (error) throw error;
      res.send(results)
    });
  } catch (exception_var) {
    console.log("Error");
  }
});




//  ************************************************************************************************************************
// ************************************************************************************************************************
// ********************************************        User Functions          ********************************************
// ************************************************************************************************************************
//************************************************************************************************************************

app.post("/register", async (req, res) => {
  try {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(req.body.password, salt);
    let userdata = {
      callsign: req.body.callsign,
      password: hashedPassword,
      name: req.body.name,
      email: req.body.email,
      admin: "No",
      status: "Pending",
    };
    connection.query(
      `SELECT callsign FROM users WHERE callsign=${connection.escape(
        req.body.callsign
      )}`,
      function (error, results, fields) {
        if (error) throw error;
        if (results == "") {
          connection.query(
            "INSERT INTO users SET ?",
            userdata,
            function (error, results, fields) {
              if (error) throw error;
              sendEmail(
                req.body.email,
                "W0DBQ: Your new Account",
                "Your account was created and currently pending approval. You will get an email when it has been approved."
              );
              sendEmail(
                "joseph.feyen@gmail.com",
                "W0DBQ: New Account Request",
                `${req.body.name} (${req.body.callsign}) has signed up for an account. This account will need to be appoved before becoming active.`
              );

              res.send("registered");
            }
          );
        } else {
          res.send(`Username ${req.body.callsign} is already registered!`);
        }
      }
    );
  } catch (exception_var) {
    console.log(exception_var);
  }
});

app.post("/login", async (req, res) => {
  const callsign = { callsign: req.body.callsign };
  const accesstoken = jwt.sign(callsign, process.env.jwt_secret);
  try {
    connection.query(
      `SELECT * FROM users WHERE callsign='${req.body.callsign}'`,
      function (error, results, fields) {
        //if (error) throw error;
        if (results == "") {
          res.send({ status: "Incorrect username or password!" });
        } else {
          bcrypt.compare(
            req.body.password,
            results[0].password,
            function (err, isMatch) {
              if (err) {
                throw err;
              } else if (!isMatch) {
                res.send({ status: "Incorrect username or password!" });
                // console.log("fail")
              } else {
                connection.query(
                  `SELECT status FROM users Where callsign='${req.body.callsign}'`,
                  function (error, statusresults, fields) {
                    if (statusresults[0].status == "Active") {
                      res.send({
                        status: "pass",
                        callsign: req.body.callsign,
                        token: accesstoken,
                      });
                    } else {
                      res.send({
                        status: `Your account status: ${statusresults[0].status}`,
                      });
                      // console.log("pass")
                    }
                  }
                );
              }
            }
          );
        }
      }
    );
  } catch (exception_var) {
    //console.log("error")
  }
});

app.get("/auth", authenticateToken, (req, res) => {
  res.send("authorized");
});

app.post("/bodmembers", authenticateToken, (req, res) => {
  let id = req.query.id;
  try {
    connection.query(
      `UPDATE bod SET name='${req.body.name}', callsign='${req.body.callsign}', image='${req.body.image}' WHERE id='${id}'`,
      function (error, results, fields) {
        if (error) throw error;
        //console.log(results)
        res.send(results);
      }
    );
  } catch (exception_var) {
    console.log("Error" + exception_var);
  }
});

app.get("/adminauth", (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);
  jwt.verify(token, process.env.jwt_secret, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    try {
      connection.query(
        `SELECT admin FROM users WHERE callsign = '${user.callsign}'`,
        function (error, results, fields) {
          if (error) throw error;
          res.send(results[0].admin);
        }
      );
    } catch (exception_var) {
      console.log("Error" + exception_var);
    }
  });
});

app.get("/mediaauth", (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);
  jwt.verify(token, process.env.jwt_secret, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    try {
      connection.query(
        `SELECT photos FROM users WHERE callsign = '${user.callsign}'`,
        function (error, results, fields) {
          if (error) throw error;
          res.send(results[0].photos);
        }
      );
    } catch (exception_var) {
      console.log("Error" + exception_var);
    }
  });
});

app.get("/netauth", (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);
  jwt.verify(token, process.env.jwt_secret, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    try {
      connection.query(
        `SELECT net_control FROM users WHERE callsign = '${user.callsign}'`,
        function (error, results, fields) {
          if (error) throw error;
          res.send(results[0].net_control);
        }
      );
    } catch (exception_var) {
      console.log("Error" + exception_var);
    }
  });
});

app.get("/marketauth", (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);
  jwt.verify(token, process.env.jwt_secret, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    try {
      connection.query(
        `SELECT market FROM users WHERE callsign = '${user.callsign}'`,
        function (error, results, fields) {
          if (error) throw error;
          res.send(results[0].market);
        }
      );
    } catch (exception_var) {
      console.log("Error" + exception_var);
    }
  });
});

app.get("/users", authenticateToken, (req, res) => {
  try {
    connection.query(`Select * From users`, function (error, results, fields) {
      if (error) throw error;
      res.send(results);
    });
  } catch (exception_var) {
    console.log("Error");
  }
});

app.post("/userstatus", authenticateToken, (req, res) => {
  function statuscheck(status) {
    if (status == "Pending" || status == "Disabled") {
      return "Active";
    } else {
      return "Disabled";
    }
  }
  try {
    connection.query(
      `Select status From users WHERE id='${req.body.userid}'`,
      function (error, results, fields) {
        if (error) throw error;
        try {
          connection.query(
            `UPDATE users SET status = '${statuscheck(
              results[0].status
            )}' WHERE id='${req.body.userid}'`,
            function (error1, results1, fields) {
              if (error1) throw error1;
              //console.log(results1)

              try {
                connection.query(
                  `SELECT email, status FROM users WHERE id='${req.body.userid}'`,
                  function (error2, results2, fields) {
                    if (error2) throw error2;

                    sendEmail(
                      results2[0].email,
                      "Account Status",
                      `Your account status is ${results2[0].status}`
                    );
                  }
                );
              } catch (exception_var) {
                console.log("Error");
              }
            }
          );
        } catch (exception_var) {
          console.log("Error");
        }
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.post("/userright", authenticateToken, (req, res) => {
  function userright(status) {
    if (status == "false" || status == "") {
      return "true";
    } else {
      return "false";
    }
  }

  try {
    const userRightField = req.body.userright; // Store the userRight field name

    connection.query(
      `SELECT ${userRightField} FROM users WHERE id='${req.body.userid}'`,
      function (error, results, fields) {
        if (error) throw error;
        try {
          connection.query(
            `UPDATE users SET ${userRightField} = '${userright(
              results[0][userRightField]
            )}' WHERE id='${req.body.userid}'`,
            function (error1, results1, fields) {
              if (error1) throw error1;
            }
          );
        } catch (exception_var) {
          console.log("Error");
        }
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

// ****************************************
// ****************************************
// ****     Public Rendering Pages     ****
// ****************************************
// ****************************************

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/nets", (req, res) => {
  res.render("nets");
});

app.get("/signin", (req, res) => {
  res.render("signin");
});

// app.get('/rr', (req, res) => {
//   res.render('railroad')
// })

// app.get('/videos', (req, res) => {
//   res.render('videos')
// })

// app.get('/calendar', (req, res) => {
//   res.render('calendar')
// })

// app.get('/bod', (req, res) => {
//   res.render('bod')
// })

// app.get('/about', (req, res) => {
//   res.render('about')
// })

// app.get('/iaspota', (req, res) => {
//   res.render('iaspota')
// })

// app.get('/logger', (req, res) => {
//   res.render('logger')
// })

// app.get('/fdlogger', (req, res) => {
//   res.render('fdlogger')
// })

// app.get('/photos', (req, res) => {
//   res.render('photos')
// })

app.get("/test", (req, res) => {
  try {
    connection.query(`SELECT * FROM users`, function (error, results, fields) {
      if (error) throw error;

      res.render("test", { data: results });
    });
  } catch (exception_var) {
    console.log("Error");
  }
});

// ************************************************************************************************************************
// ************************************************************************************************************************
// ********************************************    Members Rendering Pages     ********************************************
// ************************************************************************************************************************
// ************************************************************************************************************************

app.get("/admin", (req, res) => {
  let id = req.query.id;
  const decodedToken = jwt.verify(id, process.env.jwt_secret);
  let data = {
    //   nav: `
    //<button class="tablinks active" onclick="openCity(event, 'calendaradmin')">Calendar Admin</button>
    //
    // <button class="tablinks" onclick="openCity(event, 'bod')">BOD Admin</button>
    //
    //
    // `,
  };
  try {
    connection.query(
      `Select * From users WHERE callsign = '${decodedToken.callsign}'`,
      function (error, results, fields) {
        if (error) throw error;

        if (results[0].admin == "false") {
          res.render("index");
        } else {
          if (results[0].calendar == "true") {
            data.calendar = `<button class="tablinks" onclick="openCity(event, 'calendaradmin')">Calendar Admin</button>`;
          }

          if (results[0].bod == "true") {
            data.bod = `<button class="tablinks" onclick="openCity(event, 'bod')">BOD Managment</button>`;
          }

          if (results[0].users == "true") {
            data.users = `<button class="tablinks" onclick="openCity(event, 'users')">User Managment</button>`;
          }

          if (results[0].lunch == "true") {
            data.lunch = `<button class="tablinks" onclick="openCity(event, 'lunch')">Lunch Bunch</button>`;
          }

          if (results[0].testing == "true") {
            data.testing = `<button class="tablinks" onclick="openCity(event, 'testing')">Testing</button>`;
          }

          res.render("admin", data);
        }
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.get("/reset", (req, res) => {
  let auth = req.query.auth
  let callsign = req.query.callsign
  try {
    connection.query(`SELECT TIMESTAMPDIFF(MINUTE, reset_timeout, NOW()) AS time FROM users where callsign = '${callsign}' and reset_auth = '${auth}'`, function (error, results, fields) {
      if (error) throw error;
      let data = {auth: auth}
      if(results[0].time >= 0) {
        res.render("login")
      } else {
        data.status = "Pass"
        res.render("reset", data)
      }
    });
  } catch (exception_var) {
    console.log("Error");
  }
});

app.post("/reset", (req, res) => {
  let callsign = req.body.callsign
  const timestamp = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
  const randomString = generateRandomString(32, timestamp);
  
  try {
    connection.query(`UPDATE users set reset_auth = '${randomString}', reset_timeout =  DATE_ADD(now(),INTERVAL 10 MINUTE) WHERE callsign='${callsign}'`, function (error, results, fields) {
      if (error) throw error;
      
      try {
        connection.query(`Select email, reset_auth FROM users WHERE callsign='${callsign}'`, function (error1, results1, fields1) {
          if (error1) throw error1;
            console.log(results1[0].email)
            sendEmail(results1[0].email, 'W0DBQ: Password Reset', `This is the link from W0DBQ.org to reset your password. \n\n https://w0dbq.org/reset?callsign=${callsign}&auth=${results1[0].reset_auth}  \n\n This reset link is only good for 10 minutes.`)
            res.send('An email has been sent to you')
        });
      } catch (exception_var) {
        console.log("Error");
      }

    });
  } catch (exception_var) {
    console.log("Error");
  }

});

app.put("/reset", async (req, res) => {
  let auth = req.body.auth
  const salt = await bcrypt.genSalt();
  const hashedPassword = await bcrypt.hash(req.body.password, salt);

  try {
    connection.query(`UPDATE users set password = '${hashedPassword}', reset_auth='', reset_timeout = ''  WHERE reset_auth = '${auth}'`, function (error, results, fields) {
      if (error) throw error;
      //console.log(results)
      res.send('reset')
    });
  } catch (exception_var) {
    console.log("Error");
  }
});



app.get("/edit", (req, res) => {
  let id = req.query.id;
  const decodedToken = jwt.verify(id, process.env.jwt_secret);
  try {
    connection.query(
      `Select * From users WHERE callsign = '${decodedToken.callsign}'`,
      function (error, results, fields) {
        if (error) throw error;

        if (results[0].edit == "false") {
          res.render("index");
        } else {
          res.render("edit");
        }
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.get("/logout", (req, res) => {
  res.render("logout");
});

// app.get('/managephotos', (req, res) => {
//   res.render('managephotos')results[0].calender
// })

// app.get('/marketplace', (req, res) => {
//   res.render('marketplace')
// })
// ************************************************************************************************************************
// ************************************************************************************************************************

// ************************************************************************************************************************
// ************************************************************************************************************************
// ********************************************           API Calls            ********************************************
// ************************************************************************************************************************
// ************************************************************************************************************************

app.get("/getevent", (req, res) => {
  let id = req.query.id;
  try {
    connection.query(
      `SELECT description from calendar WHERE id=${id}`,
      function (error, results, fields) {
        if (error) throw error;
        res.send(results);
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.get("/getcalendar", (req, res) => {
  try {
    connection.query(
      `SELECT * from calendar`,
      function (error, results, fields) {
        if (error) throw error;
        res.send(results);
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.get("/lunch", (req, res) => {
  let d = new Date().toISOString();
  d = d.substring(0, 10);

  try {
    connection.query(
      `SELECT * from calendar WHERE start >= STR_TO_DATE('${d}', '%Y-%m-%d') AND type ='Lunch Bunch' order by start ASC LIMIT 1`,
      function (error, results, fields) {
        if (error) throw error;

        res.send(results);
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.get("/testing", (req, res) => {
  let d = new Date().toISOString();
  d = d.substring(0, 10);
  try {
    connection.query(
      `SELECT start from calendar WHERE start >= STR_TO_DATE('${d}', '%Y-%m-%d') AND type ='Testing' order by start ASC LIMIT 1`,
      function (error, results, fields) {
        if (error) throw error;

        res.send(results);
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.get("/bodmembers", (req, res) => {
  try {
    connection.query(`SELECT * from bod`, function (error, results, fields) {
      if (error) throw error;

      res.send(results);
    });
  } catch (exception_var) {
    console.log("Error");
  }
});




// ****************************************************************************************************************************************
// ****                                                  IASPOTA API's                                                                 ****
// ****************************************************************************************************************************************

app.get("/aispotalogs", (req, res) => {
  try {
    connection.query(
      `SELECT * from iaspota_logs`,
      function (error, results, fields) {
        if (error) throw error;
        res.send(results);
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.get("/aispotaparks", (req, res) => {
  try {
    connection.query(
      `SELECT * from iaspota_parks`,
      function (error, results, fields) {
        if (error) throw error;
        res.send(results);
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.get("/aispotaoperators", (req, res) => {
  try {
    connection.query(
      `SELECT operator, count(DISTINCT(callsign)) FROM iaspota_logs group by operator order by count(DISTINCT(callsign)) desc limit 5;`,
      function (error, results, fields) {
        if (error) throw error;
        res.send(results);
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.get("/aispotacount", (req, res) => {
  try {
    connection.query(
      `SELECT COUNT(*) FROM iaspota_logs count_demos`,
      function (error, results, fields) {
        if (error) throw error;
        res.send(results);
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.get("/aispotsearch", (req, res) => {
  let park = req.query.park;
  try {
    connection.query(
      `SELECT * FROM iaspota_logs WHERE park= '${park}'`,
      function (error, results, fields) {
        if (error) throw error;
        res.send(results);
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});





// ****************************************************************************************************************************************
// ****                                          Railroads on the Air API's                                                            ****
// ****************************************************************************************************************************************

function depotadd(adddepot) {
  try {
    connection.query(
      `INSERT INTO rr_depots SET ? `,
      { depot: adddepot },
      function (error, results, fields) {
        // if (error) throw error;
        return "Depot Added";
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
}

app.get("/rrdepots", (req, res) => {
  try {
    connection.query(
      `SELECT * FROM rr_depots ORDER BY depot ASC`,
      function (error, results, fields) {
        if (error) throw error;
        res.send(results);
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.get("/depots", (req, res) => {
  let depot = req.query.depot;
  try {
    connection.query(
      `SELECT * FROM rr_depots WHERE depot = '${depot}'`,
      function (error, results, fields) {
        if (error) throw error;
        if (results[0] === undefined) {
          try {
            depotadd(req.query.depot);
            res.send("Log was added");
          } catch {
            res.send("Error adding Depot");
          }
        } else {
          res.send("");
        }
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.get("/rrstats", (req, res) => {
  try {
    let cat = req.body.cat;
    connection.query(
      `SELECT operator, count(*) as occurrences FROM rr_log GROUP BY operator ORDER BY occurrences DESC LIMIT 3;`,
      function (error, results, fields) {
        if (error) throw error;

        res.send(results);
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.get("/rrlocations", (req, res) => {
  try {
    let cat = req.body.cat;
    connection.query(
      `SELECT location, count(*) as occurrences FROM rr_log GROUP BY location ORDER BY occurrences DESC LIMIT 3;`,
      function (error, results, fields) {
        if (error) throw error;
        //console.log(results)
        res.send(results);
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.get("/rrchaser", (req, res) => {
  try {
    let cat = req.body.cat;
    connection.query(
      `SELECT callsign, count(*) as occurrences FROM rr_log GROUP BY callsign ORDER BY occurrences DESC LIMIT 3;`,
      function (error, results, fields) {
        if (error) throw error;
        //console.log(results)
        res.send(results);
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.get("/rrcount", (req, res) => {
  try {
    let cat = req.body.cat;
    connection.query(
      `SELECT count(*) as total FROM rr_log ;`,
      function (error, results, fields) {
        if (error) throw error;
        //console.log(results)
        res.send(results);
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.post("/rrlog", (req, res) => {
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
      location: logdepot,
    };
    try {
      connection.query(
        `INSERT INTO rr_log SET ?`,
        sqldata,
        function (error, results, fields) {
          if (error) throw error;
        }
      );
    } catch (exception_var) {
      res.send("Error");
      return;
    }
  }
  res.send("Logs submitted successfully!");
  //
});

app.get("/rrcalendar", (req, res) => {
  try {
    connection.query(`SELECT * FROM rr_cal`, function (error, results, fields) {
      if (error) throw error;
      res.send(results);
    });
  } catch (exception_var) {
    console.log("Error");
  }
});

app.post("/rrcal", (req, res) => {
  try {
    let sqldata = {
      callsign: req.body.callsign,
      date: req.body.date,
      time: req.body.time,
      location: req.body.location,
      band: req.body.band,
    };
    connection.query(
      `INSERT INTO rr_cal SET ?`,
      sqldata,
      function (error, results, fields) {
        if (error) throw error;
        res.send(results);
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});



// ****************************************************************************************************************************************
// ****                                                 ARES API's                                                                     ****
// ****************************************************************************************************************************************

app.get("/arescontrolers", (req, res) => {
  let d = new Date().toISOString();
  d = d.substring(0, 10);
  try {
    connection.query(
      `SELECT * from ares_netcontrol WHERE date >= STR_TO_DATE('${d}', '%Y-%m-%d') order by date ASC LIMIT 4`,
      function (error, results, fields) {
        if (error) throw error;
        res.send(results);
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.get("/arescontrol", (req, res) => {
  let d = new Date().toISOString();
  d = d.substring(0, 10);
  try {
    connection.query(
      `SELECT * from ares_netcontrol WHERE date STR_TO_DATE('${d}', '%Y-%m-%d') order by date ASC LIMIT 1`,
      function (error, results, fields) {
        if (error) throw error;
        res.send(results);
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});



// ****************************************************************************************************************************************
// ****                                                Field Day API's                                                                 ****
// ****************************************************************************************************************************************

app.get("/qrzLookUp", (req, res) => {
  let callsign = req.query.callsign;
  let band = req.query.band;
  let mode = req.query.mode;

  fetch(
    "https://xmldata.qrz.com/xml/current/?username=kd9hae;password=ArmY1234$$"
  )
    .then((response) => response.text())
    .then((keydata) => {
      fetch(`https://api.factmaven.com/xml-to-json?xml=${keydata}`)
        .then((response) => response.json())
        .then((data) => {
          // lookup(data.QRZDatabase.Session.Key)

          fetch(
            `https://xmldata.qrz.com/xml/current/?s=${data.QRZDatabase.Session.Key};callsign=${callsign}`
          )
            .then((response) => response.text())
            .then((dbdata) => {
              fetch(`https://api.factmaven.com/xml-to-json?xml=${dbdata}`)
                .then((response) => response.json())
                .then((logdata) => {
                  let type = "New";
                  try {
                    connection.query(
                      `SELECT * FROM logs WHERE callsign='${callsign}' AND band='${band}' AND mode='${mode}' AND year='2021'`,
                      function (error, results, fields) {
                        if (error) throw error;
                        if (!results.length) {
                          type = "New";
                        } else {
                          type = "Duplicate";
                        }
                      }
                    );
                  } catch (exception_var) {
                    console.log("Error");
                  }

                  //console.log(logdata)
                  let calldata = {
                    lat: logdata.QRZDatabase.Callsign.lat,
                    lng: logdata.QRZDatabase.Callsign.lon,
                    class: logdata.QRZDatabase.Callsign.state,
                    name: logdata.QRZDatabase.Callsign.name_fmt,
                    image: logdata.QRZDatabase.Callsign.image,
                    type: type,
                  };

                  res.send(JSON.stringify(calldata));
                });
            });
        });
    });
});



// ****************************************************************************************************************************************
// ****                                        Image and Video Managemant  API's                                                       ****
// ****************************************************************************************************************************************

app.post("/uploadmedia", upload.array("files"), (req, res) => {
  function mediatype(mime) {
    if (mime == "jpeg") {
      return "image";
    } else if (mime == "mp4") {
      return "video";
    }
  }

  const promises = req.files.map((file) => {
    return new Promise((resolve, reject) => {
      const filetype = file.mimetype.split("/");
      const sqldata = {
        url: `/img/${file.filename}`,
        active: "New",
        frontpage: "No",
        filetype: mediatype(filetype[1]),
      };
      connection.query(
        `INSERT INTO images SET ?`,
        sqldata,
        function (error, results, fields) {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        }
      );
    });
  });

  Promise.all(promises)
    .then(() => {
      res.render("upload");
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send("An error occurred during file upload");
    });
});

app.get("/uploadmedia", authenticateToken, (req, res) => {
  let type = req.query.type;
  function mediatype(mime) {
    if (mime == "jpeg") {
      return "image";
    } else if (mime == "mp4") {
      return "video";
    }
  }

  try {
    connection.query(
      `SELECT * FROM images WHERE active = '${type}' Order by id desc`,
      function (error, results, fields) {
        if (error) throw error;
        res.send(results);
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.put("/uploadmedia", authenticateToken, (req, res) => {
  let id = req.query.id;
  //console.log(req.body)
  try {
    connection.query(
      `UPDATE images SET ? Where id = '${id}'`,
      req.body,
      function (error, results, fields) {
        if (error) throw error;
        res.send("Updated");
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.delete("/uploadmedia", authenticateToken, (req, res) => {
  let id = req.query.id;
  try {
    connection.query(
      `UPDATE images SET active = 'No' WHERE id= '${id}'`,
      function (error, results, fields) {
        if (error) throw error;
        res.send("Deleted");
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});



// ****************************************************************************************************************************************
// ****                                         Photo Gallery & Slideshot  API's                                                       ****
// ****************************************************************************************************************************************

app.get("/gallery", (req, res) => {
  let type = req.query.type;
  try {
    connection.query(
      `SELECT * from images WHERE active='Yes' order by id DESC`,
      function (error, results, fields) {
        if (error) throw error;
        res.send(results);
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.get("/gallerydetails", (req, res) => {
  let id = req.query.id;
  try {
    connection.query(
      `SELECT * from images WHERE id = '${id}'`,
      function (error, results, fields) {
        if (error) throw error;
        res.send(results);
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.post("/images", (req, res) => {
  let image = req.body;
  try {
    connection.query(
      `INSERT INTO images SET ?`,
      image,
      function (error, results, fields) {
        if (error) throw error;
        res.send("Success");
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.get("/slideshow", (req, res) => {
  try {
    connection.query(
      `SELECT * from images WHERE active='Yes' AND frontpage = 'Yes' order by id DESC`,
      function (error, results, fields) {
        if (error) throw error;
        res.send(results);
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.get("/images", (req, res) => {
  let type = req.query.type;
  try {
    connection.query(
      `SELECT * from images WHERE active='Yes' AND type = '${type}' order by id DESC`,
      function (error, results, fields) {
        if (error) throw error;
        res.send(results);
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});




// ****************************************************************************************************************************************
// ****                                              Admin BOD Image API's                                                             ****
// ****************************************************************************************************************************************

app.get("/bodimages", (req, res) => {
  const imageFolder = path.join(__dirname);
  fs.readdir(imageFolder, (err, files) => {
    if (err) {
      console.error(err);
      res.status(500).send("Server error");
      return;
    }

    const images = files.filter((file) => {
      const ext = path.extname(file);
      return (
        ext === ".png" || ext === ".jpg" || ext === ".jpeg" || ext === ".gif"
      );
    });

    res.json(images);
  });
});

app.get("/files", (req, res) => {
  const fileFolder = path.join(__dirname, "/public/img/bod");
  fs.readdir(fileFolder, (err, files) => {
    if (err) {
      console.error(err);
      res.status(500).send("Server error");
      return;
    }
    res.json(files);
  });
});

app.post("/bodupload", (req, res) => {
  const photoData = req.body.photo;

  // decode base64 data into binary data
  const binaryData = Buffer.from(photoData, "base64");

  // generate a unique filename for the photo
  const filename = Date.now() + ".jpg";

  // set the path where the photo will be saved
  const imagePath = path.join(__dirname, "/public/img/bod/", filename);

  // write binary data to file
  fs.writeFile(imagePath, binaryData, (err) => {
    if (err) {
      console.error(err);
      res.status(500).send("Failed to upload photo");
    } else {
      res.send("Photo uploaded successfully");
    }
  });
});




// ****************************************************************************************************************************************
// ****                                            Admin Lunch Bunch API's                                                             ****
// ****************************************************************************************************************************************

app.get("/lbdates", (req, res) => {
  let image = req.body;
  try {
    connection.query(
      `SELECT * FROM calendar WHERE start >= DATE_ADD(CURDATE(), INTERVAL (7 - WEEKDAY(CURDATE())) DAY)   AND start <= DATE_ADD(CURDATE(), INTERVAL (7 - WEEKDAY(CURDATE())) + 6 * 10 DAY) AND type = 'Lunch Bunch'`,
      function (error, results, fields) {
        if (error) throw error;
        res.send(results);
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.get("/lblist", (req, res) => {
  try {
    connection.query(
      `SELECT * FROM lunch_locations Order BY location Asc`,
      function (error, results, fields) {
        if (error) throw error;
        res.send(results);
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.get("/lblistdetail", (req, res) => {
  let location = req.query.location;
  try {
    connection.query(
      `SELECT * FROM lunch_locations Where location='${location}'`,
      function (error, results, fields) {
        if (error) throw error;
        res.send(results);
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.post("/lblistupdate", authenticateToken, (req, res) => {
  try {
    connection.query(
      `UPDATE lunch_locations SET location='${req.body.location}', address='${req.body.address}' Where id='${req.body.id}'`,
      function (error, results, fields) {
        if (error) throw error;
        res.send(results);
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.post("/addloc", authenticateToken, (req, res) => {
  try {
    connection.query(
      `INSERT INTO lunch_locations SET ?`,
      req.body,
      function (error, results, fields) {
        if (error) throw error;

        res.send(results);
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.post("/lbupdatecalloc", authenticateToken, (req, res) => {
  try {
    connection.query(
      `SELECT * FROM lunch_locations WHERE location='${req.body.location}'`,
      function (error, results, fields) {
        if (error) throw error;

        try {
          let caldesc = results[0].location + " " + results[0].address;
          //console.log(`UPDATE calendar SET description='${caldesc}', location='${results[0].location}', address='${results[0].address}' WHERE id='${results[0].id}'`)
          connection.query(
            `UPDATE calendar SET description='${caldesc}', location='${results[0].location}', address='${results[0].address}' WHERE id='${req.body.id}'`,
            function (error1, results1, fields1) {
              if (error1) throw error1;
              //console.log(results1)
              res.send(results1);
            }
          );
        } catch (exception_var) {
          console.log("Error");
        }
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});




// ****************************************************************************************************************************************
// ****                                          Admin Testing Calenar API's                                                           ****
// ****************************************************************************************************************************************

app.get("/testlist", authenticateToken, (req, res) => {
  try {
    connection.query(
      `SELECT * FROM calendar WHERE type = 'testing' Order BY start desc limit 12`,
      function (error, results, fields) {
        if (error) throw error;
        res.send(results);
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.delete("/testlist", authenticateToken, (req, res) => {
  let id = req.query.id;
  try {
    connection.query(
      `Delete FROM calendar WHERE id= '${id}'`,
      function (error, results, fields) {
        if (error) throw error;
        res.send("Deleted");
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.post("/testlist", authenticateToken, (req, res) => {
  let data = {
    start: req.body.date,
    end: req.body.date,
    title: "Testing",
    type: "Testing",
    daysOfWeek: "",
    color: "Slate",
    isMultipleDay: false,
    description: req.body.info,
    location: req.body.location,
    Address: req.body.address,
  };

  try {
    connection.query(
      `INSERT INTO calendar SET ?`,
      data,
      function (error, results, fields) {
        if (error) throw error;

        res.send("Added");
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.get("/testlocations", (req, res) => {
  let name = req.query.name;

  if (name == undefined) {
    try {
      connection.query(
        `SELECT * FROM testing Order BY name ASC`,
        function (error, results, fields) {
          if (error) throw error;
          res.send(results);
        }
      );
    } catch (exception_var) {
      console.log("Error");
    }
  } else {
    try {
      connection.query(
        `SELECT * FROM testing WHERE name = '${name}'`,
        function (error, results, fields) {
          if (error) throw error;
          res.send(results);
        }
      );
    } catch (exception_var) {
      console.log("Error");
    }
  }
});

app.post("/testlocations", authenticateToken, (req, res) => {
  let data = {
    name: req.body.name,
    address: req.body.address,
  };
  try {
    connection.query(
      `INSERT INTO testing SET ?`,
      data,
      function (error, results, fields) {
        if (error) throw error;

        res.send(results);
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

// ****************************************************************************************************************************************
// ****                                                Admin Ares Page API's                                                           ****
// ****************************************************************************************************************************************

app.get("/pagedata", (req, res) => {
  let page = req.query.page;

  try {
    connection.query(
      `SELECT * FROM pages WHERE page = '${page}'`,
      function (error, results, fields) {
        if (error) throw error;
        res.send(results);
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.get("/pagelist", (req, res) => {
  try {
    connection.query(
      `SELECT nav_title,page FROM pages WHERE edit='Yes'`,
      function (error, results, fields) {
        if (error) throw error;
        res.send(results);
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.post("/pagedata", authenticateToken, (req, res) => {
  try {
    // Use a parameterized query with placeholders
    const sql = `UPDATE pages SET ${req.body.table} = ? WHERE page = ?`;
    const values = [req.body.data, req.body.page];

    connection.query(sql, values, function (error, results, fields) {
      if (error) {
        console.error("Error:", error.message);
        res.status(500).send("An error occurred.");
      } else {
        res.send("Saved");
      }
    });
  } catch (exception_var) {
    console.error("Error:", exception_var.message);
    res.status(500).send("An error occurred.");
  }
});

// ****************************************************************************************************************************************
// ****                                                 Net Control API's                                                              ****
// ****************************************************************************************************************************************

app.get("/netlist", authenticateToken,  (req, res) => {
  let net = req.query.net;
  try {
    connection.query(`SELECT * FROM nets WHERE id = '${net}'`,
      function (error, results, fields) {
        if (error) throw error;
        try {
          connection.query(`SELECT * FROM nets_list WHERE net = '${results[0].net}' AND last >= DATE_SUB(NOW(), INTERVAL 30 DAY) ORDER BY suffix ASC`,
            function (error1, results1, fields) {
              if (error1) throw error;
              res.send(results1);
            }
          );
        } catch (exception_var) {
          console.log("Error");
        }
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.post("/startnet", authenticateToken,  (req, res) => {
          
          try {
            connection.query(`INSERT INTO nets SET ?`, req.body, function (error, results, fields1) {
                if (error) throw error;
                console.log(results)
                res.send(results);
              }
            );
          } catch (exception_var) {
            console.log("Error");
          }
});

app.get("/endnet", authenticateToken,  (req, res) => {
  let etime = getCurrentDateTime();
  let net = req.query.net
  try {
    connection.query(`SELECT COUNT(*) AS count FROM net_checkin WHERE net_id = ${net}`, function (error, results, fields1) {
        if (error) throw error;
        console.log(results[0].count)
    
        try {
          let data = {
            netend: etime,
            count: results[0].count
          }
          connection.query(`UPDATE nets SET ? WHERE id = ${net}`, data, function (error, results, fields1) {
              if (error) throw error;
              res.send(results);
            }
          );
        } catch (exception_var) {
          console.log("Error");
        }
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.get("/netcheckin", authenticateToken,  (req, res) => {
  let net = req.query.net
  try {
    connection.query(`SELECT * FROM net_checkin WHERE net_id = ${net} AND traffic = 'true' ORDER BY suffix ASC`, function (error, results, fields1) {
        if (error) throw error;
        
        res.send(results);
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.post("/netcheckin", authenticateToken,  (req, res) => {
  try {
    connection.query(`INSERT INTO net_checkin SET ?`, req.body, function (error, results, fields1) {
        if (error) throw error;
        res.send(results);
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.get('/pdf', (req, res) => {
  let net = req.query.net
    connection.query(`SELECT name,callsign FROM nets_list WHERE net = '${net}' ORDER BY suffix ASC`, (err, results) => {
      if (err) {
        console.error('Error executing query:', err);
        connection.end();
        return res.status(500).send('Error executing query');
      }

      // Build the HTML content
      let htmlContent = `<h1 style="text-align: center; color: #ff5f1f;">W0DBQ: ${net} Call Roster</h1>`;
      //htmlContent += '<p style="text-align: left; padding: 20px; border: 2px #ff5f1f solid; border-radius: 10px;">This is (your callsign) calling the W0DBQ Great River Amatuer Radio Sunday 2 meter net. This net meets every Sunday at 7pm on the W0DBQ repeater at 147.240Mhz with a Pl tone of 103.5 and the Jackson county repeater at 146.060mhz with a PL tone of 103.5. This is a directed net. Members will be called by roll call. When called please give your name, callsign, location, and indicate if you have traffic for the net. All traffic will be handled after committe reports. We will now check for any stations having priority or emergancy traffic. Any stations having priority or emergancy traffic please call (your callsign).</p>';
      htmlContent += '<center><div style="display: flex; justify-content: center;">';
      htmlContent += '<table style="width: 100%; border-collapse: collapse; border: 1px solid black; margin-top: 20px;">';
      htmlContent += '<tr style="background-color: #FF5F1F; color: white;"><th style="border: 1px solid black; padding: 8px; width: 20%;">Name</th><th style="border: 1px solid black; padding: 8px; width: 10%;">Callsign</th><th style="border: 1px solid black; padding: 8px;  width: 5%;">Checked In</th> <th style="border: 1px solid black; padding: 8px;  width: 5%;">Traffic</th> <th style="border: 1px solid black; padding: 8px; width: auto;">Notes</th></tr>';
      //htmlContent += `<tr><td style="border: 1px solid black; padding: 8px;"></td><td style="border: 1px solid black; padding: 8px;"></td><td style="border: 1px solid black; padding: 8px;"> </td><td style="border: 1px solid black; padding: 8px;"> </td> </tr>`;
      for (const row of results) {
        
        htmlContent += `<tr><td style="border: 1px solid black; padding: 8px;">${row.name}</td><td style="border: 1px solid black; padding: 8px;">${row.callsign}</td><td style="border: 1px solid black; padding: 8px;"><center><input type="checkbox"></center> </td><td style="border: 1px solid black; padding: 8px;"><center><input type="checkbox"></center> </td> <td style="border: 1px solid black; padding: 8px;"> </td></tr>`;
      }
      htmlContent += `<tr><td style="border: 1px solid black; padding: 8px;"></td><td style="border: 1px solid black; padding: 8px;"></td><td style="border: 1px solid black; padding: 8px;"><center><input type="checkbox"></center> </td><td style="border: 1px solid black; padding: 8px;"><center><input type="checkbox"></center> </td> <td style="border: 1px solid black; padding: 8px;"> </td></tr>`;
      htmlContent += `<tr><td style="border: 1px solid black; padding: 8px;"></td><td style="border: 1px solid black; padding: 8px;"></td><td style="border: 1px solid black; padding: 8px;"><center><input type="checkbox"></center> </td><td style="border: 1px solid black; padding: 8px;"><center><input type="checkbox"></center> </td> <td style="border: 1px solid black; padding: 8px;"> </td></tr>`;
      htmlContent += '</table>';
      htmlContent += '</div></center>';

      // Convert HTML to PDF
      pdf.create(htmlContent).toStream((err, stream) => {
        if (err) {
          console.error('Error creating PDF:', err);
          connection.end();
          return res.status(500).send('Error creating PDF');
        }

        // Stream the PDF to the response
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=netlist.pdf');
        stream.pipe(res);
        
        // Close the database connection
        connection.end();
      });
    });
  });

  // ****************************************************************************************************************************************
// ****************************************************************************************************************************************
// ****                                        Net Control Testing Calenar API's                                                       ****
// ****************************************************************************************************************************************
// ****************************************************************************************************************************************

app.get("/signin-list", (req, res) => {
  try {
    connection.query(`SELECT * FROM signin_list WHERE status = 'Active' ORDER By suffix Asc`, req.body, function (error, results, fields1) {
        if (error) throw error;
        res.send(results);
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});

app.post("/signin", (req, res) => {
    const type = req.body.type

    if(type == 'member') {
      const id = req.body.id
      let d = new Date()
      let logdate = d.toISOString().split('T')[0]
      let data = {
        signin: id,
        date: logdate
      }

        try {
          connection.query(`SELECT * FROM meetings WHERE signin = ? AND date = ?`, [id, logdate], function (error, results, fields1) {
              if (error) throw error;
              if(results.length === 1) {
                res.send('You are already signed in for this meeting!')
              } else {
                connection.query(`INSERT INTO meetings SET ?`, data, function (error, results, fields1) {
                  if (error) throw error;
                  res.send("You have been checked in to the meeting!");
                  }
                );
              }
            }
          );
        } catch (exception_var) {
          console.log("Error");
        }
    }

    if(type == 'new') {

      const fname = req.body.fname
      const lname = req.body.lname
      const callsign = req.body.callsign
      const email = req.body.email
      const phone = req.body.phone
      let d = new Date()
      let logdate = d.toISOString().split('T')[0]

      let getsuffix = (call) => {
        try {
          const suffix = call.replace(/^\D+/, '').substring(1);
        console.log(suffix)
        if(call !== ""){
          return suffix;
        }else {
          return ''
        }
        } catch {
          return ""
        }
      }

      let data = {
        fname: fname,
        lname: lname,
        callsign: callsign,
        email: email,
        phone: phone,
        suffix: getsuffix(callsign)
      }

      console.log(data)

      connection.query('SELECT id FROM signin_list WHERE fname = ? AND lname = ? AND callsign = ?',
        [fname, lname, callsign],
        (error, results) => {
          if (error) throw error;

          if (results.length === 0) {
            // Row doesn't exist in signin_list, so insert it
            connection.query('INSERT INTO signin_list SET ?', data, (error, insertResults) => {
              if (error) throw error;

              const signinId = insertResults.insertId;

              // Step 2: Check if the row exists in meetings
              connection.query('SELECT id FROM meetings WHERE signin = ? AND date = ?', [signinId, logdate], (error, meetingResults) => {
                if (error) throw error;

                if (meetingResults.length === 0) {
                  // Row doesn't exist in meetings, so insert it
                  let data = {signin: signinId, date: logdate}
                  connection.query('INSERT INTO meetings SET ?', data, (error) => {
                    if (error) throw error;
                    res.send('You have been signed into the meeting!')
                  });
                } else {
                  res.send('You are already signed into meetings');
                }
              });
            });
          } else {
            // Row already exists in signin_list, so check if it exists in meetings
            const signinId = results[0].id;
            connection.query('SELECT id FROM meetings WHERE signin = ? AND date = ?', [signinId, logdate], (error, meetingResults) => {
              if (error) throw error;

              if (meetingResults.length === 0) {
                // Row doesn't exist in meetings, so insert it
                
                connection.query('INSERT INTO meetings SET ?', [signinId, logdate], (error) => {
                  if (error) throw error;
                  res.send('You have been signed into the meeting!')
                });
              } else {
                res.send('You are already signed into meetings');
              }
            });
          }
        });

  }

});

app.get("/signin-count", (req, res) => {
  let d = new Date()
  let logdate = d.toISOString().split('T')[0]
  try {
    connection.query(`SELECT COUNT(signin) AS occurrences FROM meetings WHERE date = ? GROUP BY date`, [logdate], function (error, results, fields1) {
        if (error) throw error;
        res.send(results);
      }
    );
  } catch (exception_var) {
    console.log("Error");
  }
});




app.get("/:page", (req, res) => {
  let page = req.params.page;
  console.log(page);
  try {
    // Use a parameterized query with placeholders
    const sql = `SELECT * FROM pages WHERE page = ?`;
    const values = [page];

    connection.query(sql, values, function (error, results, fields) {
      if (error) {
        console.error("Error:", error.message);
        res.status(500).send("An error occurred.");
      } else {
        console.log(results);
        const data = {
          main: results[0].info,
          right_col: results[0].rightcol,
          nav_title: results[0].nav_title,
          title: results[0].title,
          js: results[0].scripts,
          css: results[0].css,
          header: results[0].header,
          auth: results[0].auth,
        };
        res.render(results[0].pagelayout, data);
      }
    });
  } catch (exception_var) {
    console.error("Error:", exception_var.message);
    res.render("index");
  }
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});