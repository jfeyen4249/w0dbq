

function sitemenu() {
  document.getElementById("nav-bar").innerHTML += `
<ul class="nav navbar-nav pull-right">
<li><a href="/">Home</a></li>
<li class="dropdown">
    <a href="#" class="dropdown-toggle" data-toggle="dropdown">Events <b class="caret"></b></a>
    <ul class="dropdown-menu">
        <li><a href="/calendar">Calendar</a></li>
        <li><a href="/iaspota">IASPOTA</a></li>
        <li><a href="https://www.lctota.org/">Lewis and Clark Trail on the Air</a></li>
        <li><a href="rr">Iowa Railroads on the Air</a></li>
        <li><a href="#">Field Day 2022</a></li>

        
    </ul>
</li>
<li class="dropdown">
    <a href="#" class="dropdown-toggle" data-toggle="dropdown">Connect with the Club<b class="caret"></b></a>
    <ul class="dropdown-menu">
        <li><a href="/about">About Us</a></li>
        <li><a href="/photos">Photo Gallery</a></li>
        <li><a href="#">Repeaters</a></li>
        <li><a href="/bod">Board Of Directors</a></li>
        <li><a href="#">Loaner Tools</a></li>
    </ul>
</li>
<li class="dropdown">
    <a href="#" class="dropdown-toggle" data-toggle="dropdown">Emergency Communications<b class="caret"></b></a>
    <ul class="dropdown-menu">
        <li><a href="/ares">ARES</a></li>
        <li><a href="#">Administration</a></li>
        <li><a href="#">Dubuque GMRS RADIO CLUB</a></li>
    </ul>
</li>
<li class="dropdown">
   
</li>
<li><a href="#">Contact</a></li>
<li><a class="btn" href="/login">SIGN IN / SIGN UP</a></li>
</ul>`;
}

function memberMenu() {
  document.getElementById("nav-bar").innerHTML += `
<ul class="nav navbar-nav pull-right">
<li><a href="/">Home</a></li>
<li class="dropdown">
    <a href="#" class="dropdown-toggle" data-toggle="dropdown">Events <b class="caret"></b></a>
    <ul class="dropdown-menu">
        <li><a href="/calendar">Calendar</a></li>
        <li><a href="/iaspota">IASPOTA</a></li>
        <li><a href="https://www.lctota.org/">Lewis and Clark Trail on the Air</a></li>
        <li><a href="rr">Iowa Railroads on the Air</a></li>
        <li><a href="#">Field Day 2022</a></li>

        
    </ul>
</li>
<li class="dropdown">
    <a href="#" class="dropdown-toggle" data-toggle="dropdown">Connect with the Club<b class="caret"></b></a>
    <ul class="dropdown-menu">
        <li><a href="/about">About Us</a></li>
        <li><a href="/photos">Photo Gallery</a></li>
        <li><a href="#">Repeaters</a></li>
        <li><a href="/bod">Board Of Directors</a></li>
        <li><a href="#">Loaner Tools</a></li>
    </ul>
</li>
<li class="dropdown">
    <a href="#" class="dropdown-toggle" data-toggle="dropdown">Emergency Communications<b class="caret"></b></a>
    <ul class="dropdown-menu">
        <li><a href="/ares">ARES</a></li>
        <li><a href="#">Administration</a></li>
        <li><a href="#">Dubuque GMRS RADIO CLUB</a></li>
    </ul>
</li>
<li class="dropdown">
    <a href="#" class="dropdown-toggle " data-toggle="dropdown">Members<b class="caret"></b></a>
    <ul class="dropdown-menu">
        <li><a href="#" class="members">Hello <span class="member">${sessionStorage.getItem(
          "username"
        )}<span></a></li>
        <li><a href="/admin?id=${sessionStorage.getItem(
          "token"
        )}">Administration</a></li>
        <li><a href="/edit?id=${sessionStorage.getItem(
          "token"
        )}">Page Editor</a></li>
        <li><a href="/upload?">Upload Photos & Videos</a></li>
        <li><a href="/nets">Net Control Operator</a></li>
        <li><a href="/managephotos?id=${sessionStorage.getItem(
          "token"
        )}">Manage Photos</a></li>
        <li><a href="/marketplace">Marketplace</a></li>
        <li><a href="/logout">Logout</a></li>
    </ul>
</li>
<li><a href="#">Contact</a></li>
</ul>`;
}

if (
  typeof sessionStorage.getItem("username") !== "undefined" &&
  sessionStorage.getItem("username") !== null
) {
  memberMenu();
} else {
  sitemenu();
}
