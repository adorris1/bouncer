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
    assholes[cmd[0]] = cmd[1];
    console.log(cmd);
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
//  if (req.connection.remoteAddress == '10.0.10.150') {
  if (req.socket.remoteAddress in assholes) {
    req.connection.end();
    return false;
  } else {
    return true;
  }
  console.log(req.socket.remoteAddress);
}

//This connects to the aggregation server and accepts upstream commands.
setInterval(function() {
  if (!upstreamConnection) {
    upstreamConnection = net.connect({host: UPSTREAM_LOGSERVER, port: 5555})
    upstreamConnection.write('S');
    //upstreamConnection.on('connect', function(c) {
    //  c.write('S');
    //});
    upstreamConnection.on('data', function(data) {
      commandDo(data);
    });
    upstreamConnection.on('error', function () {
      upstreamConnection = null;
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
