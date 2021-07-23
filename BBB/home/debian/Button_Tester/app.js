var b = require('bonescript'); //for GPIO
var os = require( 'os' ); //for getting network addresses
var mqtt = require('mqtt'); //for sending MQTT messages


var inputPin = 'P9_27'; //GPIO 115
b.pinMode(inputPin, b.INPUT); //configure switch as input
b.pinMode("USR0", b.OUTPUT); //Onboard LED 1
b.pinMode("USR1", b.OUTPUT); //Onboard LED 2
b.pinMode("USR2", b.OUTPUT); //Onboard LED 3
b.pinMode("USR3", b.OUTPUT); //Onboard LED 4
var flag = 0; //This flag is for catching the very first interrupt. After the BBB turns on, a false interrupt occurs
var clientId = 'ANT1014'; //Client ID
var host = 'mqtt://mb6.iotfm.org';    // Reference implementation.
var client = mqtt.connect(host, {
        port: 1883,
        clientId: clientId,
        rejectUnauthorized: true
    }
);

b.attachInterrupt(inputPin, true, b.RISING, interruptCallback); //Attach interrupt to pin

function interruptCallback(x) { //if a switch is connected
    if (flag == 1)
    {
        var topic = 'Asset/'+clientId+'/ItemWorkComplete'; //get the topic
        var IP = os.networkInterfaces().wlan0[0].address; //get the IP address
        var MAC = os.networkInterfaces().wlan0[0].mac.split(':').join(''); //get the MAC
        var now = new Date(); //get the time
        var payload = {
            "Id":"MAC"+MAC,
            "dateTime": now.toISOString(),  // Note: UTC time.
            "assetId": clientId,
            "dataItemId": "ItemWorkComplete",
            "value": "true"
        };
        console.log(payload);
        client.publish(topic, JSON.stringify(payload)); //publish to topic
        setTimeout(function () { //flash LED
            b.digitalWrite("USR0", 0);
            b.digitalWrite("USR1", 0);
            b.digitalWrite("USR2", 0);
            b.digitalWrite("USR3", 0);
        }, 250);

        b.digitalWrite("USR0", 1);
        b.digitalWrite("USR1", 1);
        b.digitalWrite("USR2", 1);
        b.digitalWrite("USR3", 1);
    }
    else
    {
        flag = 1;
    }
}

function HeartBeat()//Heartbeat messages
{
    var IP = os.networkInterfaces().wlan0[0].address;//get IP address
    var MAC = os.networkInterfaces().wlan0[0].mac.split(':').join('');//get MAC address
    var now = new Date(); //get time
    var topic = 'Asset/'+clientId+'/Heartbeat'; //get topic
    var payload = {
        "Id":"MAC"+MAC,
        "IPAddress":IP,
        "dateTime": now.toISOString(),  // Note: UTC time.
        "assetId": clientId,
        "dataItemId": "Heartbeat"
    };
    console.log(payload);
    client.publish(topic, JSON.stringify(payload)); //publish to client
}

setInterval(HeartBeat,60000); //send heartbeat every 1 minute