// some documentation here
// guh
//

/*
user should be able to place script tag into index.html
and it should magically work

<div id="Lantern"></div>

if there's no Lantern ID, then we assume the user is using API mode

*/

const Lantern = (function() {
    // private
    var data;
    let locationEndpoint = "/location";
    let eventName = "dataBroadcast";
    function _init(apiURL, code, updateFreq, dataHandler) {
        // TODO validate types
        var obj = new Object();
        obj.apiURL = apiURL;
        obj.code = code;
        obj.updateFreq = updateFreq;
        obj.pinging = false;
        if (document.addEventListener) {
            document.addEventListener(eventName, dataHandler, false);
        } else {
            document.attachEvent(eventName, dataHandler);
        }
        return obj;
    }
    function _ready() {
        if (!data) return false;
        return true;
    }
    // TODO default error function?
    //
    function _wrap(handler) {
        return function(e) {
            return handler(e.detail);
        };
    }
    async function _update() { // doesn't need to be async
        // assume data exists
        // https://dmitripavlutin.com/timeout-fetch-request/
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 5*1000); // default 5 seconds
        // console.log(data.apiURL+locationEndpoint+"/"+data.code);
        // TODO -- if user doesn't put http or https, we have to have it
        await fetch(data.apiURL+locationEndpoint+"/"+data.code, { // can change await
                cache: 'no-cache',
                referrerPolicy: 'no-referrer',
                timeout: data.updateFreq * 1000,
                signal: controller.signal
            })
        .then( response => response.json() )
        .then( data => document.dispatchEvent(new CustomEvent(eventName, { detail:data })) )
        .catch( err => console.log(err) );
        clearTimeout(id);
    }
    // public
    return {
        init: function(apiURL="localhost:1025", code="****", updateFreq=2, dataHandler=function(e) {return e;}) {
            if (!_ready()) {
                data = _init(apiURL, code, updateFreq, _wrap(dataHandler));
            }
            // no need to return
        },
        //
        getCode: function() {
            if (!_ready()) {
                return null;
            }
            return data.code;
        },
        setCode: function(code) {
            if (!_ready()) {
                return null;
            }
            // TODO validate code
            data.code = code;
        },
        //
        getUpdateFreq: function() {
            if (!_ready()) {
                return null;
            }
            return data.updateFreq;
        },
        setUpdateFreq: function(updateFreq) {
            if (!_ready()) {
                return null;
            }
            // TODO validate updateFreq type
            data.updateFreq = updateFreq;
        },
        //
        isActive: function() {
            if (!_ready()) {
                return null;
            }
            // TODO query API for active
            return true;
        },
        startDataPing: function() {
            if (this.isActive() && !data.pinging) {
                data.pinging = true;
                data.intervalID = window.setInterval(_update, data.updateFreq * 1000);
            }
            return null;
        },
        stopDataPing: function() {
            if (this.isActive && data.pinging) {
                window.clearInterval(data.intervalID);
                data.pinging = false;
            }
            return null;
        }
    };
})();


let Ld = document.getElementById('Lantern');
if (Ld !== null) { // they want auto-mode
    let start = function() {
        // console.log(event);
        Ld.innerHTML =
            `<form style="text-align: center;">
                <label for="form-code">Session (random 4-character code): </label>
                <input type="text" name="code" id="form-code">
                <label for="form-api-url">URL (leave blank if it's the current page): </label>
                <input type="text" name="api" id="form-api-url">
                <input type="submit">
            </form>`;
    
        let mapdiv = document.createElement('div');
        mapdiv.id = 'map';
        mapdiv.style.height = 3*window.innerHeight/5 + "px";
        // mapdiv.style.width = "75%"; // todo
        Ld.appendChild(mapdiv);
        let map = L.map(mapdiv, {
            center: [40.781329, -73.966671],
            zoom: 12
        });
        // blessed http://leaflet-extras.github.io/leaflet-providers/preview/index.html
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            maxZoom: 19,
            subdomains: 'abcd'
        }).addTo(map);
        let currPos = L.marker([40.781329, -73.966671]).addTo(map); // TODO -- make it change color when live (this is default position)
        // keep latlon as polyline
        let currPath = L.polyline([], {color:'red'}).addTo(map);
        // https://stackoverflow.com/questions/979975/how-to-get-the-value-from-the-get-parameters
        let url = new URL(window.location.href);
        let code = url.searchParams.get("code");
        let api = url.searchParams.get("api");
        console.log(code,api);
        if (code !== '') {
            // TODO
            // let flying = false;
            // map.on('flystart', function(){
            //     flying = true;
            // });
            // map.on('flyend', function(){
            //     flying = false;
            // });
            if (api !== '') {
                Lantern.init(apiURL=api, code=code, updateFreq=3, dataHandler=function(e) {
                    if (e.error) {
                        Lantern.stopDataPing();
                        console.log(e);
                        return;
                    }
                    // update lat/lon position on map
                    if (!currPos.getLatLng().equals(e.location)) {
                        currPos.setLatLng(e.location);
                        currPath.addLatLng(e.location);
                    }
                    // if (!flying)
                    map.flyTo(e.location);
                    // map.fitBounds(currPath.getBounds());
                });
            } else {
                // apiURL=url.origin+url.pathname.replace(/\/+$/, '')+'/api'
                Lantern.init(apiURL=url.pathname.replace(/\/+$/, '')+'/api', code=code, updateFreq=3);
            }
            Lantern.startDataPing();
        }
    };
    // DEPENDENCY:
    // https://leafletjs.com/download.html
    // we've gotten to this point (this script should be loaded after leaflet, and/or in the body of the page),
    // so check if L (leaflet) exists
    if (typeof L == "undefined") {
        let link = document.createElement('link'); // check onload?
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.7.1/dist/leaflet.css";
        // link.integrity = "sha512-xodZBNTC5n17Xt2atTPuE1HxjVMSvLVW9ocqUKLsCC5CXdbqCmblAshOMAS6/keqq/sMZMZ19scR4PsZChSR7A==";
        // link.crossorigin = "anonymous";
        document.head.appendChild(link);
        //
        let script = document.createElement('script');
        script.src = "https://unpkg.com/leaflet@1.7.1/dist/leaflet.js";
        script.onload = start;
        // script.integrity = "sha512-XQoYMqMTK8LvdxXYG3nZ448hOEQiglfqkJs1NOQV44cWnUrBc8PkAOcXy20w0vlaXaVUearIOBhiXZ5V3ynxwA==";
        // script.crossorigin = "anonymous";
        document.head.appendChild(script);
    } else {
        start();
    }
} // else u gotta do it yourself get beaned

// TODO -- create demo pages
// one for auto-created 

// TODO -- android app
// should have input field for URL of page where this API goes on
// -- in a settings menu
// should give auto-generated URL if base URL is provided
// else, just display the port and read-only code
// --
// oh, well we need an API to connect to anyway
// so it'll just be the same base URL
// --
// the app should have a TEST API button
// similarly, the server should have a TEST endpoint
// maybe a statistics endpoint too
