var stream = require('stream');
var http = require('http');
var https= require('https');
var streamBuffers = require('stream-buffers');
var DOMParser = require('xmldom').DOMParser;
var os = require('os');
var mqtt = require('mqtt');

var host = 'mqtt://mb13.iotfm.org';
var clientId = 'CNC7';

var url = 'http://192.168.0.60:5000/sample?interval=0&path=//Axes//DataItem';
//var url = 'https://smstestbed.nist.gov/vds/Mazak01/sample?interval=10&path=//Axes//DataItem';
var myReadableStreamBuffer = new streamBuffers.ReadableStreamBuffer({
    frequency: 10,      // in millisecon ds.
    chunkSize: 2048     // in bytes.
});

var data_buf = [];
var count = 0;

//Raw response parsing variables
var len_curr = 0;
var len_prev = 0;

var doc_prev = '';
var doc_curr = '';

var str = '';

var flag = false;
var temp_data = '';

/////////////////////////File reader
var fs = require('fs'),
    readline = require('readline');

var Data_Item_ID = [];
var l_count = 0;
var rd = readline.createInterface({
    input: fs.createReadStream('/home/kedar/sample.txt'),
    output: process.stdout,
    console: false
});

rd.on('line', function(line) {
    l_count = l_count + 1;
    Data_Item_ID[l_count]= line;
    console.log(line);
    //console.log(lines[2]);
});
//////////////////////////////////////

setInterval(HeartBeat,6000); //send a heartbeat every 1 minute

var client = mqtt.connect(host,
    {port: 1883,
        clientId: clientId,
        username: 'mb13kedar',
        password: 'AwXPve5qdDZXDoeD'});

var timeout_wrapper = function( req ) {
    return function( ) {
        timeout = setTimeout(fn, 10000);
        // do some logging, cleaning, etc. depending on req
        console.log('Connection error');
    };
};
var req;

function Call() {

    var req = http.get(url, function (res) {
        if (res.statusCode >= 200 && res.statusCode < 400) {
            res.on('data', function (data_) {

                clearTimeout(timeout);
                timeout = setTimeout(fn, 10000);

                if (flag) {
                    data = temp_data + data_.toString();
                    temp_data = '';
                    flag = false;
                }
                else {
                    data = data_.toString();
                }

                str = data;

                if (len_prev - doc_prev.length == 0) {
                    var char_pos = len_prev - doc_prev.length + 76;
                }
                else {
                    var char_pos = len_prev - doc_prev.length + 76 + 1 + 2;
                }
                if (len_prev - doc_prev.length > data.length) {
                    doc_prev = doc_prev + data;
                }

                else if (data.length - (len_prev - doc_prev.length) < 85) {

                    temp_data = data.substr(len_prev - doc_prev.length + 3);

                    doc_prev = doc_prev + data.substring(0, len_prev - doc_prev.length);

                    myReadableStreamBuffer.push(doc_prev, "utf8");

                    doc_prev = '';
                    len_prev = 0;

                    flag = true;
                }
                else {
                    len_curr = Number(str.charAt(char_pos) + str.charAt(char_pos + 1) + str.charAt(char_pos + 2) + str.charAt(char_pos + 3) + str.charAt(char_pos + 4));

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
            res.on('error', function() {
                clearTimeout(timeout);
                console.log('Error');
            });
        }
    });
}

Call();
// generate timeout handler
var fn = timeout_wrapper( req );

// set initial timeout
var timeout = setTimeout( fn, 10000);

myReadableStreamBuffer.on('readable', function() {

    //Put the code here to parse the string and simply push to the agent
    var stri = myReadableStreamBuffer.read().toString();

    var doc = new DOMParser().parseFromString(stri);

    var genres = doc.getElementsByTagName('DeviceStream');
    availab = false;
    var samples = [];
    for(p=0;p<Data_Item_ID.length;p++) {
        for (i = 0; i < genres.length; i++) {
            var compo = genres[i].getElementsByTagName('ComponentStream');
            for (j = 0; j < compo.length; j++) {
                try {
                    //var hurko_c = compo[j].getElementsByTagName('Samples')[0].getElementsByTagName('Load');
                    //var hurko_c = compo[j].getElementsByTagName('Samples')[0].getElementsByTagName('Position');
                    var hurko_c = compo[j].getElementsByTagName('Samples')[0].getElementsByTagName(Data_Item_ID[p]);
                }
                catch (e) {
                    console.log('Error');

                }
                for (k = 0; k < hurko_c.length; k++) {
                    availab = true;
                    //console.log(hurko_c[k].getAttribute('sequence'));
                    //console.log('Value');
                    //console.log(hurko_c[k].childNodes[0].nodeValue);
                    var sample_no = hurko_c[k].getAttribute('sequence');
                    //console.log(sample_no);

                    value = hurko_c[k].childNodes[0].nodeValue;
                    dataID = hurko_c[k].getAttribute('dataItemId');
                    samples[k] = parseInt(sample_no, 10);

                    var now = new Date(); //get the time

                    var payload = {
                        "dateTime": now.toISOString(),  // Note: UTC time.
                        "assetId": 'OKUMA_NEW',
                        "dataItemId": dataID,
                        "value": value,
                        "itemInstanceId": 'Part1',
                        "operatorId": 'Operator1'
                    };
                    //console.log(payload);
                    var topic = 'Asset/' + 'OKUMA_NEW' + '/AXES'; //get the topic
                    client.publish(topic, JSON.stringify(payload));
                    console.log(payload);
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