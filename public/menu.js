document.getElementById('nav-bar').innerHTML += `
<ul class="nav navbar-nav pull-right">
<li><a href="/">Home</a></li>
<li class="dropdown">
    <a href="#" class="dropdown-toggle" data-toggle="dropdown">Events <b class="caret"></b></a>
    <ul class="dropdown-menu">
        <li><a href="/calendar">Calendar</a></li>
        <li><a href="#">IASPOTA</a></li>
        <li><a href="https://www.lctota.org/">Lewis and Clark Trail on the Air</a></li>
        <li><a href="#">Iowa Railroads on the Air</a></li>
        <li><a href="#">Field Day 2022</a></li>

        
    </ul>
</li>
<li class="dropdown">
    <a href="#" class="dropdown-toggle" data-toggle="dropdown">Connect with the Club<b class="caret"></b></a>
    <ul class="dropdown-menu">
        <li><a href="#">About Us</a></li>
        <li><a href="#">Repeaters</a></li>
        <li><a href="#">Board Of Directors</a></li>
        <li><a href="#">Loaner Tools</a></li>
        <li><a href="#"></a></li>
    </ul>
</li>
<li class="dropdown">
    <a href="#" class="dropdown-toggle" data-toggle="dropdown">Emergency Communications<b class="caret"></b></a>
    <ul class="dropdown-menu">
        <li><a href="/ares">ARES</a></li>
        <li><a href="#"></a></li>
        <li><a href="#">Early Assessment Volunteers</a></li>
        <li><a href="#">Dubuque GMRS RADIO CLUB</a></li>
    </ul>
</li>
<li><a href="#">Contact</a></li>
<li><a class="btn" href="#">SIGN IN / SIGN UP</a></li>
</ul>`