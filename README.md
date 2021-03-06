# NammaMetro Map
This App shows [Metro Rapid Transit in Bengaluru](https://en.wikipedia.org/wiki/Namma_Metro)

## How to use the App
- To see the functionality go to [Namma Metro Map - Live version](https://manubhargav.github.io/NammaMetroMap/) (See known bugs section)
OR
- Clone / Download [this Repository](https://github.com/Manubhargav/NammaMetroMap) to Dekstop and Fire up the `index.html`

## Files in the project

|── css/  
|────|── style.css  
|  
|── img/  
|────|── ic-close.png  
|────|── ic-open.png  
|  
|── js/  
|────|── app.js  
|────|── jquery-3.1.1.min.js  
|────|── knockout-3.4.1.js  
|  
|── index.html  
|── README.md


## APIs made use of:
- Google Maps API
- MediaWiki API

## Libraries used:
- jQuery
- Knockout JS

## More Resources:
- [Mock design image](http://imgur.com/a/rq3UJ)
- [Google Maps API page](https://developers.google.com/maps/documentation/javascript/)
- [MediaWiki API page](https://en.wikipedia.org/w/api.php)
- [jQuery API](http://api.jquery.com/)
- [KnockoutJS](http://knockoutjs.com/documentation/introduction.html)
- [Udacity Project Rubric](https://review.udacity.com/#!/rubrics/17/view)

## Known Bugs
- __Chrome__ - When loading the Map for the first time (Live or Offline version) *Load Unsafe scripts* next to the address bar on the right.
- __Firefox__ - Click on `i` button next to `padlock` symbol in address bar on the left -> *Disable Protection for now*  
This happens because of various APIs & libraries are used in the project. 