var stream = require('stream');
var http = require('http');
var https= require('https');
var streamBuffers = require('stream-buffers');
var DOMParser = require('xmldom').DOMParser;
var os = require('os');
var mqtt = require('mqtt');

var host = 'mqtt://mb13.iotfm.org';
var clientId = 'CNC7';

var myReadableStreamBuffer = new streamBuffers.ReadableStreamBuffer({
    frequency: 10,      // in millisecon ds.
    chunkSize: 2048     // in bytes.
});

var data_buf = [];
var count = 0;

var req;
//Raw response parsing variables
var len_curr = 0;
var len_prev = 0;

var doc_prev = '';
var doc_curr = '';

var str = '';

var flag_1 = false;
var flag_2 = false;
var check_flag = false;
var char_shift = 0;

var temp_data = '';

var Data_Item_ID = [];

var reconnect_interval;
var reconnect_http = false;

////
var json = require('/home/kedar/sample.json');

for(i=0;i<json.Data_Item_IDs.length;i++){
    Data_Item_ID[i] = json.Data_Item_IDs[i];
}
////

//var url = 'http://192.168.0.60:5000/sample?interval=0&path=//Axes//DataItem';
var url = 'https://smstestbed.nist.gov/vds/sample?interval=1000&path=//Axes//DataItem';
//var url = json.URL;

setInterval(HeartBeat,6000); //send a heartbeat every 1 minute

var client = mqtt.connect(host,
    {port: 1883,
        clientId: clientId,
        username: 'mb13kedar',
        password: 'AwXPve5qdDZXDoeD'});

function Listener(callback) {
    return {
        getFlag   : function()  {},
        setFlag   : function(p) { reconnect_http = p; callback(reconnect_http); }
    };
}

var Reconnect = Listener(function(reconnect_http) {
    if (reconnect_http) {
        Call();
        clearInterval(reconnect_interval);
        reconnect_http = false;
    }
});

var timeout_wrapper = function( req ) {
    return function( ) {

        console.log('Connection error');
        req.abort();

        reconnect_interval = setInterval(new_connection,10000);
    };
};


function new_connection(){
    Reconnect.setFlag(true);
}

function Call() {

    req = https.get(url, function (res) {
        if (res.statusCode >= 200 && res.statusCode < 400) {
            res.on('data', function (data_) {

                clearTimeout(timeout);
                timeout = setTimeout(fn, 20000);

                if (flag_2) {
                    data = temp_data + data_.toString();
                    temp_data = '';
                    flag_2 = false;
                }
                else if(flag_1){
                    data = data_.toString();
                    data = data.substr(3-char_shift);
                    flag_1 = false;
                    char_shift = 0;
                }
                else if(check_flag){
                    console.log(data_.toString().length);
                    check_flag = false;
                    data = data_.toString().substr(3);
                }
                else {
                    data = data_.toString();
                }

                if (len_prev - doc_prev.length == 0) {
                    var char_pos = len_prev - doc_prev.length + 76;
                }
                else {
                    var char_pos = len_prev - doc_prev.length + 76 + 1 + 2;
                }

                if (len_prev - doc_prev.length > data.length) {
                    doc_prev = doc_prev + data;
                }

                else if (data.length == len_prev - doc_prev.length){
                    console.log("Catch_1");
                    doc_prev = doc_prev + data.substring(0, len_prev - doc_prev.length);

                    myReadableStreamBuffer.push(doc_prev, "utf8");

                    doc_prev = '';
                    len_prev = 0;

                    check_flag = true;
                }

                else if (data.length - (len_prev - doc_prev.length) < 3 && data.length - (len_prev - doc_prev.length) > 0) {
                    console.log("Catch_2");

                    char_shift = data.length - (len_prev - doc_prev.length);

                    doc_prev = doc_prev + data.substring(0, len_prev - doc_prev.length);

                    myReadableStreamBuffer.push(doc_prev, "utf8");

                    doc_prev = '';
                    len_prev = 0;

                    flag_1 = true;
                }

                else if (data.length - (len_prev - doc_prev.length) > 2 && data.length - (len_prev - doc_prev.length) < 93) {

                    console.log("Catch_3");
                    console.log(data.length - (len_prev - doc_prev.length));

                    temp_data = data.substr(len_prev - doc_prev.length + 3);

                    doc_prev = doc_prev + data.substring(0, len_prev - doc_prev.length);

                    myReadableStreamBuffer.push(doc_prev, "utf8");

                    doc_prev = '';
                    len_prev = 0;

                    flag_2 = true;
                }

                else {

                    len_curr = Number(data.charAt(char_pos) + data.charAt(char_pos + 1) + data.charAt(char_pos + 2) + data.charAt(char_pos + 3) + data.charAt(char_pos + 4));
                    console.log(len_curr);

                    doc_prev = doc_prev + data.substring(0, len_prev - doc_prev.length);

                    doc_curr = data.substr(char_pos + 4 + 2);

                    myReadableStreamBuffer.push(doc_prev, "utf8");

                    doc_prev = doc_curr;
                    len_prev = len_curr;
                }

            });
            res.on('end', function () {
                clearTimeout(timeout);
            });
            res.on('error', function (datas) {
                clearTimeout(timeout);
            });
        }
    });

    req.on('error', function (err) {
        timeout = setTimeout(fn, 500);
    });
}


Call();
// generate timeout handler
var fn = timeout_wrapper( req );

// set initial timeout
var timeout = setTimeout( fn, 20000);

myReadableStreamBuffer.on('readable', function() {

    //Put the code here to parse the string and simply push to the agent
    var json = require('/home/kedar/sample.json');
    var stri = myReadableStreamBuffer.read().toString();

    try {
        var doc = new DOMParser().parseFromString(stri);
    }
    catch (e) {
        console.log(stri);
    }
    var genres = doc.getElementsByTagName('DeviceStream');
    availab = false;
    var samples = [];
    for(p=0;p<json.Data_Item_IDs.length;p++) {
        for (i = 0; i < genres.length; i++) {
            var compo = genres[i].getElementsByTagName('ComponentStream');
            compo_stream:
            for (j = 0; j < compo.length; j++) {
                try {
                    var hurko_c = compo[j].getElementsByTagName('Samples')[0].getElementsByTagName(json.Data_Item_IDs[p]);
                }
                catch (e) {
                    break compo_stream;
                }
                for (k = 0; k < hurko_c.length; k++) {
                    availab = true;
                    var sample_no = hurko_c[k].getAttribute('sequence');

                    value = hurko_c[k].childNodes[0].nodeValue;
                    dataID = hurko_c[k].getAttribute('dataItemId');
                    samples[k] = parseInt(sample_no, 10);

                    var now = new Date(); //get the time

                    var payload = {
                        "dateTime": now.toISOString(),  // Note: UTC time.
                        "assetId": 'OKUMA_NEW',
                        "dataItemId": dataID,
                        //"dataItemId": json.ID_Maps[0][dataID],
                        "value": value,
                        "itemInstanceId": 'Part1',
                        "operatorId": 'Operator1'
                    };
                    var topic = 'Asset/' + 'OKUMA_NEW' + '/AXES'; //get the topic
                    client.publish(topic, JSON.stringify(payload));
                    //console.log(payload);
                }
                ;
            }
        }
    }
});

function HeartBeat() //Heartbeat messages
{
    //var IP = os.networkInterfaces().wlan0[0].address; //get IP address
    //var MAC = os.networkInterfaces().wlan0[0].mac.split(':').join(''); //get MAC address
    var IP = "IP";
    var MAC= "MAC";
    var now = new Date(); //get the time
    var topic = 'Asset/'+'OKUMA_NEW'+'/Heartbeat'; //get the topic
    var payload = {
        "dateTime": now.toISOString(),  // Note: UTC time.
        "assetId": clientId,
        "dataItemId": "Heartbeat",
        "MACAddress": MAC,
        "IPAddress":IP
    };

    client.publish(topic, JSON.stringify(payload));
}