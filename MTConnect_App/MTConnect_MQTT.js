var que = [];
var samples = [];
var next_sample = 0;
var next_sample_str = '3293030';
var payload = '';
var THRESHOLD_SIZE = 9;
var COUNT = '3';

var value;
var dataID;

var https = require('https');
var http = require('http');
var fs = require('fs');
var xml2js = require('xml2js');
var parser = new xml2js.Parser();
var DOMParser = require('xmldom').DOMParser;

//setInterval(HeartBeat,6000); //send a heartbeat every 1 minute
//setInterval(Push,6000); //Read the
//var b = require('bonescript'); //for GPIO
var os = require('os'); //for getting IP and MAC info
var mqtt = require('mqtt'); //for sending MQTT messages
var inputPin = 'P9_23'; //GPIO 49
//b.pinMode(inputPin, b.INPUT); //Configure pin to be GPIO
var flag = 0; //This flag is for catching the very first interrupt. After the BBB turns on, a false interrupt occurs
var clientId = 'CNC2'; //Client ID
var host = 'mqtt://mb13.iotfm.org'; // Reference implementation.
//var host = 'mqtt://test.mosquitto.org';

var data = '';

var flag = true;
var buffer_flag = false;
var availab = false;


//Listener function for modifying and identifying flag change
function Listener_1(callback) {
    return {
        getFlag   : function()  {},
        setFlag   : function(p) { flag = p; callback(flag); }
    };
}

var Flag_Modify_1 = Listener_1(function(flag) {
    if (flag) {
        HTTPS_Request();
    }
});

function Listener_2(callback) {
    return {
        getFlag   : function()  {},
        setFlag   : function(p) { flag = p; callback(flag); }
    };
}

var Flag_Modify_2 = Listener_2(function(flag) {
    if (flag) {
        Push();
    }
});

//Variables for keeping count on the sample numbers
var current_sample = 0;
var next_sample = 0;
var last_sample = 0;
//Always keep track of what is going on
//Keep pinging sequentially
//A particular sequence number must be called only once

function buffer_wait_1(){
    Flag_Modify_1.setFlag(true);
}

function write_flag(){
    Flag_Modify_1.setFlag(true);
}
function buffer_wait(){
    var now = new Date(); //get the time
    payload = {
        "dateTime": now.toISOString(),  // Note: UTC time.
        "assetId": 'OKUMA',
        "dataItemId": dataID,
        "value": value,
        "itemInstanceId": 'Part1',
        "operatorID": 'Operator1'
    };
    buffer_flag = true;

    que.push(payload);
}

var client = mqtt.connect(host,
    {port: 1883,
        clientId: clientId,
        username: 'mb13kedar',
        password: 'AwXPve5qdDZXDoeD'});

function Push()
{
    Flag_Modify_2.setFlag(false);
    var topic = 'Asset/'+'OKUMA_GENOS'+'/Temperature'; //get the topic
    while(que.length > 0){
        var pay = que.shift();
        client.publish(topic,JSON.stringify(pay));
        console.log("URURURURURURUR");
        console.log(que.length);
    }
    //console.log("PUSHHH");
}

Flag_Modify_1.setFlag(true);
Flag_Modify_2.setFlag(true);

//HTTPS response get function with callback
//Write a separate function for this, take a callback when that flag is set to true
function HTTPS_Request(){
    flag = false;
    //Send this in the GET request belowearcher
    var url = 'https://smstestbed.nist.gov/vds/Mazak01/sample?path=//Axes//DataItem&from='+next_sample_str+'&count='+COUNT;
    //var url = 'http://192.168.0.60:5000/sample?path=//Axes//DataItem&from='+next_sample_str+'&count='+COUNT;
    console.log(url);
    data = '';
    https.get(url, function (res) {
        //Reset the flag to false here indicating that it is waiting for the response
        if (res.statusCode >= 200 && res.statusCode < 400) {
            res.on('data', function (data_) {
                data += data_.toString();
            });

            res.on('end', function () {
                parser.parseString(data, function (err, result) {
                    //console.log('FINISHED', err, result);
                });
                //Write a 'for' loop to reach to fields like "Temperature"
                //Form seperate JSONs for each of the fields
                //Dump them into the main FIFO and start an event listener
                var doc = new DOMParser().parseFromString(data);
                var genres = doc.getElementsByTagName('DeviceStream');
                availab = false;
                console.log('HHHH');
                var samples = [];

                for(i=0;i<genres.length;i++){
                    var compo = genres[i].getElementsByTagName('ComponentStream');
                    for(j=0;j<compo.length;j++){
                        //var hurko_c = compo[j].getElementsByTagName('Samples')[0].getElementsByTagName('Load');
                        var hurko_c = compo[j].getElementsByTagName('Samples')[0].getElementsByTagName('Position');
                        //Exception: Accessing only tagnames by 'Angle'
                        //Different possibilities not covered at the moment
                        for(k=0;k<hurko_c.length;k++){
                            availab = true;
                            //console.log(hurko_c[k].getAttribute('sequence'));
                            console.log('Value');
                            console.log(hurko_c[k].childNodes[0].nodeValue);
                            var sample_no = hurko_c[k].getAttribute('sequence');
                            console.log(sample_no);

                            value = hurko_c[k].childNodes[0].nodeValue;
                            dataID = hurko_c[k].getAttribute('dataItemId');
                            samples[k] = parseInt(sample_no, 10);

                            var now = new Date(); //get the time

                            if(que.length < (THRESHOLD_SIZE)+1){
                                payload = {
                                    "dateTime": now.toISOString(),  // Note: UTC time.
                                    "assetId": 'OKUMA_GENOS',
                                    "dataItemId": dataID,
                                    "value": value,
                                    "itemInstanceId": 'Part1',
                                    "operatorId": 'Operator1'
                                };
                                buffer_flag = true;

                                que.push(payload);
                            }
                            else{
                                buffer_flag = false;
                                setTimeout(buffer_wait_1,4000);
                                //buffer_wait_1();
                                Flag_Modify_2.setFlag(true);
                            }
                        }
                    }
                }
                //MAke sure to not repeat the similar sample value data again
                //Do a check before hand by using a variable

                //console.log("@@@@@@");


                if(buffer_flag) {
                    next_sample = Math.max.apply(null, samples) + 1;
                    console.log("NEXT SAMPLE");
                    console.log(next_sample);
                    next_sample_str = next_sample.toString();
                    if(!availab){
                        var nsst = parseInt(next_sample_str, 10)+5;
                        console.log(nsst);
                        next_sample_str = nsst.toString();
                    }
                    Flag_Modify_1.setFlag(true);
                }
            });
        }
    });
}


//var client = mqtt.connect(host,
//    {port: 1883,
//        clientId: clientId,
//        rejectUnauthorized: true});
//var client = mqtt.connect('mqqt://test.mosquitto.org');

//b.attachInterrupt(inputPin, true, b.RISING, interruptCallback); //Attach an interrupt to the GPIO

function HeartBeat() //Heartbeat messages
{
    //var IP = os.networkInterfaces().wlan0[0].address; //get IP address
    //var MAC = os.networkInterfaces().wlan0[0].mac.split(':').join(''); //get MAC address
    var IP = "IP";
    var MAC= "MAC";
    var now = new Date(); //get the time
    var topic = 'Asset/'+clientId+'/Heartbeat'; //get the topic
    var payload = {
        "dateTime": now.toISOString(),  // Note: UTC time.
        "assetId": clientId,
        "dataItemId": "Heartbeat",
        "MACAddress": MAC,
        "IPAddress":IP
    };
}
