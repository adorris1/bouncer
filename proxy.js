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
var connections = [];
var totalConnections = 0;

//Incoming commands from upstream server
function commandDo(cmd) {
  cmd = cmd.toString().trim().toLowerCase();
  if (/^block.*/.test(cmd)) {
    cmd = cmd.slice(6).split("|")
    timeToBlock =  new Date().getTime() + parseInt(cmd[1]);
    assholes[cmd[0]] = timeToBlock;
  } else if (/^unblock.*/.test(cmd)) {
    cmd = cmd.slice(8)
    delete assholes[cmd];
  } else if (cmd == "clear") {
    return assholes = {};
  } else if (cmd == "kill") {
    cmd = cmd.slice(5)
    //connections
  };
}

function buildMessage(req, uuid) {
  message = {};
  message.host    = req.socket.remoteAddress;
  message.url     = req.url;
  message.method  = req.method;
  message.headers = req.headers;
  message.uuid    = uuid;
  return JSON.stringify(message);
}

function checkRequest(req) {
  if (req.socket.remoteAddress in assholes) {
    if (assholes[req.socket.remoteAddress] > new Date().getTime()) {
      req.connection.end();
      return false;
    } else {
      delete assholes[req.socket.remoteAddress];
      return true;
    }
  } else {
    return true;
  }
}

//This connects to the aggregation server and accepts upstream commands.
setInterval(function() {
  if (!upstreamConnection || upstreamConnection == null) {
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
//  console.log(connections.length);
// console.log(connections);
  console.log(totalConnections);
    //upstreamConnection.write("TEST\n");
  //} catch (e) {};
},1000);


proxyServer = httpProxy.createServer(function (req, res, proxy) {
  if (checkRequest(req)) {
    totalConnections += 1;
    //connections.push(proxy);
    proxy.proxyRequest(req, res, {
    host: HTTP_SERVER,
    port: HTTP_PORT
    });
    id = uuid.v4();
    try {
    upstreamConnection.write(buildMessage(req, id) + "\n");
    } catch (e) {}
  }
}).listen(PROXY_PORT);

proxyServer.proxy.on('error', function(proxy) {
  totalConnections -= 1;
  //c = connections.indexOf(proxy);
  //connections.splice(c, 1);
});

proxyServer.proxy.on('end', function(proxy) {
  totalConnections -= 1;
  //c = connections.indexOf(proxy);
  //connections.splice(c, 1);
});
