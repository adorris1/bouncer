#!/usr/bin/node

var http = require('http');
var httpProxy = require('http-proxy');
var uuid = require('uuid');
var net = require('net');

//CONSTANTS
var UPSTREAM_LOGSERVER = process.argv[2];
var HTTP_SERVER = process.argv[3];
var HTTP_PORT = process.argv[4];
var PROXY_PORT = process.argv[5];
//#TODO: add support for behind proxy

//GLOBALs
var upstreamConnection;
var assholes = {};

//Incoming commands from upstream server
function commandDo(cmd) {
  cmd = cmd.toString().trim().toLowerCase();
  if (/^block.*/.test(cmd)) {
    cmd = cmd.slice(6).split("|")
    timeToBlock =  new Date().getTime() + parseInt(cmd[1]);
    assholes[cmd[0]] = timeToBlock;
    console.log(assholes);
  } else if (/^unblock.*/.test(cmd)) {
    cmd = cmd.slice(8)
    delete assholes[cmd];
  } else if (cmd == "clear") {
    console.log("Clearing stored list.");
    return assholes = {};
  } else if (cmd == "show") {
    console.log(assholes);
  };
  console.log(cmd);
}

function buildMessage(req, uuid) {
  message = {};
  message.host    = req.socket.remoteAddress;
  message.headers = req.headers;
  message.uuid    = uuid;
  return JSON.stringify(message);
}

function checkRequest(req) {
  if (req.socket.remoteAddress in assholes) {
    console.log('in assholes list..');
    if (assholes[req.socket.remoteAddress] > new Date().getTime()) {
      console.log(assholes[req.socket.remoteAddress]);
      console.log(new Date().getTime());
      req.connection.end();
      return false;
    } else {
      delete assholes[req.socket.remoteAddress];
      return true;
    }
  } else {
    return true;
  }
  console.log(req.socket.remoteAddress);
}

//This connects to the aggregation server and accepts upstream commands.
setInterval(function() {
  if (!upstreamConnection) {
    upstreamConnection = net.connect({host: UPSTREAM_LOGSERVER, port: 5555})
    //connect to aggregator in "server" mode
    upstreamConnection.write('S');
    upstreamConnection.on('data', function(data) {
      commandDo(data);
    });
    //destroys upstream if the connection is dead
    upstreamConnection.on('error', function () {
    return upstreamConnection = null
    });
  };
},1000);

setInterval(function() {
  //try {
//    console.log(proxyServer.getConnections());
    //upstreamConnection.write("TEST\n");
  //} catch (e) {};
},1000);


proxyServer = httpProxy.createServer(function (req, res, proxy) {
  if (checkRequest(req)) {
    proxy.proxyRequest(req, res, {
    host: HTTP_SERVER,
    port: HTTP_PORT
    });
    id = uuid.v4();
    console.log(id + " started");
    try {
    upstreamConnection.write(buildMessage(req, id));
    } catch (e) {}
  }
}).listen(PROXY_PORT);

proxyServer.proxy.on('end', function() {
  console.log(id + " ended");
});

http.createServer(function(req, res) {
  res.end('hello world\n');
//  try {
}).listen(8080);
