#!/usr/bin/node

var http = require('http');
var httpProxy = require('http-proxy');
var net = require('net');

//CONSTANTS
var UPSTREAM_LOGSERVER = process.argv[2];

//GLOBALs
var upstreamConnection;
var assholes = {};

//Incoming commands from upstream server
function commandDo(cmd) {
  cmd = cmd.toString().trim().toLowerCase();
  if (/block.*/.test(cmd)) {
    cmd = cmd.slice(6).split("|")
    assholes[cmd[0]] = cmd[1];
    console.log(cmd);
  } else if (cmd == "clear") {
    console.log("Clearing stored list.");
    return assholes = {};
  } else if (cmd == "show") {
    console.log(assholes);
  };
  console.log(cmd);
}

function buildMessage(req) {
  message = {};
  message.host    = req.socket.remoteAddress;
  message.headers = req.headers;
  return JSON.stringify(message);
}

//This connects to the aggregation server and accepts upstream commands.
setInterval(function() {
  if (!upstreamConnection) {
    upstreamConnection = net.connect({host: UPSTREAM_LOGSERVER, port: 8222});
    upstreamConnection.on('data', function(data) {
      commandDo(data);
    });
    upstreamConnection.on('error', function () {
      upstreamConnection = null;
    });
  };
},1000);

setInterval(function() {
  try {
    //upstreamConnection.write("TEST\n");
  } catch (e) {};
},2000);


http.createServer(function(req, res) {
  res.end('hello world\n');
//  try {
    upstreamConnection.write(buildMessage(req));
//  } catch (e) {}
}).listen(8080);
