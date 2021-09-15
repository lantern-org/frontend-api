// some documentation here
// guh
//
const Lantern = (function() {
    // private
    var data;
    let endpointCurrPos = "/current";
    let endpointIsActive = "/active";
    let eventName = "dataBroadcast";
    function _init(apiURL, updateFreq, dataHandler) {
        // TODO validate types
        var obj = new Object();
        obj.apiURL = apiURL;
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
    async function _update() {
        // assume data exists
        // https://dmitripavlutin.com/timeout-fetch-request/
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        const response = await fetch(data.apiURL+endpointCurrPos, {
            // default options
            // method: 'GET',
            // mode: 'cors',
            cache: 'no-cache',
            // credentials: 'same-origin',
            // headers: {
            // 'Content-Type': 'application/json'
            // // 'Content-Type': 'application/x-www-form-urlencoded',
            // },
            // redirect: 'follow',
            referrerPolicy: 'no-referrer',
            // body: JSON.stringify(data), // body data type must match "Content-Type" header
            timeout = data.updateFreq * 1000,
            signal: controller.signal
        });
        clearTimeout(id);
        document.dispatchEvent(CustomEvent(eventName, { detail:response.json() }))
    }
    // public
    return {
        init: function(apiURL="localhost:80/lantern/api", updateFreq=2, dataHandler=function(e) {return e;}) {
            if (!_ready()) {
                data = _init(apiURL, updateFreq, _wrap(dataHandler));
            }
            // no need to return
        },
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
