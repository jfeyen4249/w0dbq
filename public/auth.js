const myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");
myHeaders.append("Authorization", `Bearer ${sessionStorage.getItem("token")}`);

fetch("/auth", { headers: myHeaders })
  .then((response) => response.text())
  .then((data) => {
    if (data == "Forbidden") {
      window.location.href = "/login";
    }
  });

function admin() {
  fetch("/adminauth", { headers: myHeaders })
    .then((response) => response.text())
    .then((data) => {
      if (data == "No") {
        alert("Your account is not an administrator account!!");
        window.location.href = "/";
      }
    });
}

function mediaauth() {
  fetch("/mediaauth", { headers: myHeaders })
    .then((response) => response.text())
    .then((data) => {
      console.log(data);
      if (data == "false") {
        window.location.href = "/";
      }
    });
}

function netauth() {
  fetch("/netauth", { headers: myHeaders })
    .then((response) => response.text())
    .then((data) => {
      console.log(data);
      if (data == "false") {
        window.location.href = "/";
      }
    });
}
