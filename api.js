// some documentation here
// guh
//

/*
user should be able to place script tag into index.html
and it should magically work

<div id="Lantern">
    If you see this, you might need to enable javascript...
</div>
<script src="api.js"></script>

if there's no Lantern ID, then we assume the user is using API mode
*/

// main API object
const Lantern = (function () {
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
    return function (e) {
      return handler(e.detail);
    };
  }
  async function _update() {
    // doesn't need to be async
    // assume data exists
    // https://dmitripavlutin.com/timeout-fetch-request/
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5 * 1000); // default 5 seconds
    // console.log(data.apiURL+locationEndpoint+"/"+data.code);
    // TODO -- if user doesn't put http or https, we have to have it
    await fetch(data.apiURL + locationEndpoint + "/" + data.code, {
      // can change await
      cache: "no-cache",
      referrerPolicy: "no-referrer",
      timeout: data.updateFreq * 1000,
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((data) =>
        document.dispatchEvent(new CustomEvent(eventName, { detail: data }))
      )
      .catch(console.log);
    clearTimeout(id);
  }
  // public
  return {
    init: function (
      apiURL = "localhost:1025",
      code = "****",
      updateFreq = 2,
      dataHandler = function (e) {
        return e;
      }
    ) {
      if (!_ready()) {
        data = _init(apiURL, code, updateFreq, _wrap(dataHandler));
      }
      // no need to return
    },
    //
    getCode: function () {
      if (!_ready()) {
        return null;
      }
      return data.code;
    },
    setCode: function (code) {
      if (!_ready()) {
        return null;
      }
      // TODO validate code
      data.code = code;
    },
    //
    getUpdateFreq: function () {
      if (!_ready()) {
        return null;
      }
      return data.updateFreq;
    },
    setUpdateFreq: function (updateFreq) {
      if (!_ready()) {
        return null;
      }
      // TODO validate updateFreq type
      data.updateFreq = updateFreq;
    },
    //
    isActive: function () {
      if (!_ready()) {
        return null;
      }
      // TODO query API for active
      return true;
    },
    startDataPing: function () {
      if (this.isActive() && !data.pinging) {
        data.pinging = true;
        data.intervalID = window.setInterval(_update, data.updateFreq * 1000);
      }
      return null;
    },
    stopDataPing: function () {
      if (this.isActive && data.pinging) {
        window.clearInterval(data.intervalID);
        data.pinging = false;
      }
      return null;
    },
  };
})();

// API auto-mode
let Ld = document.getElementById("Lantern");
if (Ld !== null) {
  // they want auto-mode
  // custom markers
  // https://stackoverflow.com/a/40870439
  let icon = (function () {
    let h = {}; // memoize return values
    return function (color) {
      if (!h.hasOwnProperty(color)) {
        h[color] = L.divIcon({
          className: "my-custom-pin",
          iconAnchor: [0, 24],
          labelAnchor: [-6, 0],
          popupAnchor: [0, -36],
          html: `<span style="
                        background-color: ${color};
                        width: 2rem;
                        height: 2rem;
                        display: block;
                        left: -1rem;
                        top: -1rem;
                        position: relative;
                        border-radius: 3rem 3rem 0;
                        transform: rotate(45deg);
                        border: 1px solid #FFFFFF
                    " />`,
        });
      }
      return h[color];
    };
  })();
  // entrypoint
  let start = function () {
    // console.log(event);
    Ld.innerHTML = `<form style="text-align: center;">
                <label for="form-code">Session (random 4-character code): </label>
                <input type="text" name="code" id="form-code">
                <label for="form-api-url">URL (leave blank if it's the current page): </label>
                <input type="text" name="api" id="form-api-url">
                <input type="submit">
            </form>`;

    let mapdiv = document.createElement("div");
    mapdiv.id = "map";
    mapdiv.style.height = (3 * window.innerHeight) / 5 + "px";
    // mapdiv.style.width = "75%"; // todo
    Ld.appendChild(mapdiv);
    let map = L.map(mapdiv, {
      center: [40.781329, -73.966671],
      zoom: 12,
    });
    // blessed http://leaflet-extras.github.io/leaflet-providers/preview/index.html
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
        subdomains: "abcd",
      }
    ).addTo(map);
    let currPos = L.marker([40.781329, -73.966671], {
      icon: icon("blue"),
    }).addTo(map);
    let snapper = 0; // 0,1,2 = free,snapToPos,snapToPath
    // add toggle to snap to currPos
    // https://github.com/CliffCloud/Leaflet.EasyButton/
    L.Control.Snapper = L.Control.extend({
      onAdd: function (_map) {
        // TODO -- move to custom styling with classes -- helpful for switching themes
        let div = L.DomUtil.create("div");
        let txt = [" Free View", " Snap to Position", " Snap to Path"];
        for (let i = 0; i < 3; i++) {
          let rad = L.DomUtil.create("input", "", div);
          rad.type = "radio";
          rad.name = "snapperRadio";
          rad.value = i;
          rad.id = "radio-" + i;
          rad.style.width = "16px";
          rad.style.height = "16px";
          rad.style.background = "white";
          rad.style.borderRadius = "5px";
          rad.style.border = "2px solid #555";
          this["_rad" + i] = rad;
          L.DomEvent.on(rad, "change", (e) => {
            console.log(e);
            if (e.target.checked) {
              snapper = i;
            }
          });
          //
          let lbl = L.DomUtil.create("label", "", div);
          lbl.for = "centerPosCheckbox";
          lbl.style.color = "white";
          lbl.style.fontSize = "20px";
          lbl.innerText = txt[i];
          L.DomUtil.create("br", "", div);
        }
        return div;
      },
      onRemove: function (_map) {
        for (let i = 0; i < 3; i++) {
          L.DomEvent.off(this["_rad" + i]);
        }
      },
    });
    L.control.snapper = function (opts) {
      return new L.Control.Snapper(opts);
    };
    L.control.snapper({ position: "bottomleft" }).addTo(map);
    // keep latlon as polyline
    let currPath = L.polyline([], { color: "red" }).addTo(map);
    // https://stackoverflow.com/questions/979975/how-to-get-the-value-from-the-get-parameters
    let url = new URL(window.location.href);
    let code = url.searchParams.get("code");
    let api = url.searchParams.get("api");
    console.log(code, api);
    if (code && /^[A-Z0-9]{4}$/.test(code)) {
      // TODO
      // let flying = false;
      // map.on('flystart', function(){
      //     flying = true;
      // });
      // map.on('flyend', function(){
      //     flying = false;
      // });
      apiURL = api;
      if (!api || api === "") {
        apiURL = url.origin + url.pathname.replace(/\/+$/, "") + "/api";
      }
      Lantern.init(
        (apiURL = apiURL),
        (code = code),
        (updateFreq = 1.5),
        (dataHandler = function (e) {
          currPos.bindPopup(JSON.stringify(e, null, 2));
          if (e.error) {
            console.log(e);
            Lantern.stopDataPing();
            currPos.setIcon(icon("red"));
            return;
          }
          if (e.status == "Paused") {
            currPos.setIcon(icon("orange"));
          }
          let loc = [e.latitude, e.longitude];
          // update lat/lon position on map
          if (!currPos.getLatLng().equals(loc)) {
            currPos.setLatLng(loc);
            currPath.addLatLng(loc);
            currPos.setIcon(icon("green"));
          }
          // if (!flying)
          // map.flyTo(e.location);
          //
          // set a button to snap to current location
          switch (snapper) {
            case 0:
              // nothing
              break;
            case 1:
              map.panTo(loc);
              break;
            case 2:
              map.fitBounds(currPath.getBounds());
              break;
            default:
              break;
          }
        })
      );
      Lantern.startDataPing();
      // currPos.setIcon(icon("green"));
    }
  };
  // DEPENDENCY:
  // https://leafletjs.com/download.html
  // we've gotten to this point (this script should be loaded after leaflet, and/or in the body of the page),
  // so check if L (leaflet) exists
  if (typeof L == "undefined") {
    let link = document.createElement("link"); // check onload?
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.7.1/dist/leaflet.css";
    // link.integrity = "sha512-xodZBNTC5n17Xt2atTPuE1HxjVMSvLVW9ocqUKLsCC5CXdbqCmblAshOMAS6/keqq/sMZMZ19scR4PsZChSR7A==";
    // link.crossorigin = "anonymous";
    document.head.appendChild(link);
    //
    let script = document.createElement("script");
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

// TODO --
// the app should have a TEST API button
// similarly, the server should have a TEST endpoint
// maybe a statistics endpoint too
