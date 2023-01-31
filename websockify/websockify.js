#!/usr/bin/env node

// A WebSocket to TCP socket proxy
// Copyright 2012 Joel Martin
// Licensed under LGPL version 3 (see docs/LICENSE.LGPL-3)

// Known to work with node 0.8.9
// Requires node modules: ws and optimist
//     npm install ws optimist


var argv = require('optimist').argv,
    net = require('net'),
    http = require('http'),
    https = require('https'),
    url = require('url'),
    path = require('path'),
    fs = require('fs'),
    mime = require('mime-types'),

    Buffer = require('buffer').Buffer,
    WebSocketServer = require('ws').Server,

    webServer, wsServer,
    source_host, source_port, target_host, target_port

const { whitelist } = require('./whitelist');

const ack = Buffer.from("50585941434b", "hex");

// Handle new WebSocket client
new_client = function(client, req) {
    var clientAddr = client._socket.remoteAddress, log;

    log = function (msg) {
        console.log(' ' + clientAddr + ': '+ msg);
    };
    log('WebSocket connection');

    var target;
    var useConnectionString = !target_host;
    var firstMessageSeen = false;

    const setupTarget = () => {
        target.on('data', function(data) {
            argv.debug && log("sending message: " + data);

            try {
                client.send(data);
            } catch(e) {
                log("Client closed, cleaning up target");
                target.end();
            }
        });
        target.on('end', function() {
            log('target disconnected');
            client.close();
        });
        target.on('error', function(error) {
            log('target connection error', error);
            target.end();
            client.close();
        });
    }

    if (!useConnectionString) {
      target = net.createConnection(target_port, target_host, function() {
        log('connected to target');
      });
      setupTarget();
    }

    client.on('message', function(msg) {
      if (!firstMessageSeen) {
            firstMessageSeen = true;

            const strMsg = msg.toString();
            let addr, port;
            try {
                const connetctionObject = JSON.parse(strMsg);
                addr = connetctionObject.addr;
                port = connetctionObject.port;

                if (typeof addr != "string" || typeof port !== "number") {
                    throw Error(`Wrong connection string: ${strMsg}`);
                }

                // if this is not a connection string mode but we still have received the correct connection string,
                // acknowledge this message and do no further processing
                if (!useConnectionString) {
                    client.send(ack);
                    return;
                }
            } catch (e) {
                if (useConnectionString) {
                    console.trace(e);
                    log("Protocol error, expecting connection string as a first message")
                    client.close();
                    return;
                }
            }

            if (useConnectionString && !target) {
                const addrString = `${addr}:${port}`;
                log(`Connecting to ${addrString}`);
                if (whitelist.indexOf(addrString) === -1) {
                    log("Dropping connection, not in whitelist");
                    client.close();
                    return;
                }

                target = net.createConnection(port, addr, function() {
                    log('connected to target using connection string, sending ACK');
                    client.send(ack);
                });
                setupTarget();
                return;
            }
      }

      target.write(msg);
    });
    client.on('close', function(code, reason) {
        log('WebSocket client disconnected: ' + code + ' [' + reason + ']');
        target?.end();
    });
    client.on('error', function(a) {
        log('WebSocket client error: ' + a);
        target?.end();
    });
};

if (!argv._.length) {
    console.error("websockify.js [source_addr:]source_port [target_addr:target_port]");
    process.exit(2);
}

// parse source and target arguments into parts
try {
    source_arg = argv._[0].toString();

    var idx;
    idx = source_arg.indexOf(":");
    if (idx >= 0) {
        source_host = source_arg.slice(0, idx);
        source_port = parseInt(source_arg.slice(idx+1), 10);
    } else {
        source_host = "";
        source_port = parseInt(source_arg, 10);
    }

    target_arg = argv._[1].toString();
    idx = target_arg.indexOf(":");
    if (idx < 0) {
        throw("target must be host:port");
    }
    target_host = target_arg.slice(0, idx);
    target_port = parseInt(target_arg.slice(idx+1), 10);

    if (isNaN(source_port) || isNaN(target_port)) {
        throw("illegal port");
    }
} catch(e) {
}

console.log("WebSocket settings: ");
if (target_host && target_port) {
  console.log("    - proxying from " + source_host + ":" + source_port +
              " to " + target_host + ":" + target_port);
} else {
  console.log("    - proxying from " + source_host + ":" + source_port +
              ' to any whitelisted host and port. First message to this server must be a JSON string with connection details: {"addr": "x.x.x.x", "port": 1234}');
}

if (argv.cert) {
    argv.key = argv.key || argv.cert;
    var cert = fs.readFileSync(argv.cert),
        key = fs.readFileSync(argv.key);
    console.log("    - Running in encrypted HTTPS (wss://) mode using: " + argv.cert + ", " + argv.key);
    webServer = https.createServer({cert: cert, key: key});
} else {
    console.log("    - Running in unencrypted HTTP (ws://) mode");
    webServer = http.createServer();
}

if (argv.whitelist) {
  console.log("Adding extra connections to whitelist");
  argv.whitelist.split(",").forEach(val => {
    whitelist.push(val);
  });
}

webServer.listen(source_port, function() {
    wsServer = new WebSocketServer({server: webServer});
    wsServer.on('connection', new_client);
});
