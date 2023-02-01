## websockify-js: WebSockets support for any application/server

websockify was formerly named wsproxy and was part of the
[noVNC](https://github.com/kanaka/noVNC) project.

At the most basic level, websockify just translates WebSockets traffic
to normal socket traffic. Websockify accepts the WebSockets handshake,
parses it, and then begins forwarding traffic between the client and
the target in both directions.

Note that this is the JavaScript version of websockify. The primary
project is the [Python version of
websockify](https://github.com/novnc/websockify).

To run websockify-js:

```
    cd websockify
    yarn
    ./websockify.js [options] [SOURCE_ADDR:]PORT [TARGET_ADDR:PORT]
```
If `[TARGET_ADDR:PORT]` is not specified, the client might connect to any endpoint they specify in the connection string JSON in form `{"addr": "x.x.x.x", "port": 1234}`. In this mode the proxy will await the connection string JSON as the *first message*, otherwise it will disconnect. The server will whitelist all endpoints listed in `whitelist.js` and accept extra whitelisted endpoints passed as comma separated string in `whitelist` CLI argument. Example: `--whitelist="example.com:3333,example.com:4444"`;

### Docker

Alternatively, use docker image to run the server, assuming the server will listen on port 8888:

```
docker run --restart=always -d --name=wsproxy -p 127.0.0.1:8888:8888 mainnetpat/wsproxy 0.0.0.0:8888 example.com:8888
```

If you are using docker, nginx and certbot for SSL support you can configure nginx with the fillowing:

```
# vi /etc/nginx/sites-enabled/default

server {
    server_name your.server.domain;

    location / {
            limit_rate 100k; # if you want to limit the bandwith passing through your proxy

            proxy_set_header        Host $host;
            proxy_set_header        X-Real-IP $remote_addr;
            proxy_set_header        X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header        X-Forwarded-Proto $scheme;
            proxy_connect_timeout 7d;
            proxy_send_timeout 7d;
            proxy_read_timeout 7d;
            chunked_transfer_encoding off;
            proxy_buffering off;

            proxy_pass http://127.0.0.1:8888;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
    }
}
```

Then run `sudo certbot --nginx` and follow the instructions.

### News/help/contact

Notable commits, announcements and news are posted to
<a href="http://www.twitter.com/noVNC">@noVNC</a>

If you are a websockify developer/integrator/user (or want to be)
please join the <a
href="https://groups.google.com/forum/?fromgroups#!forum/novnc">noVNC/websockify
discussion group</a>

Bugs and feature requests can be submitted via [github
issues](https://github.com/novnc/websockify-js/issues).

If you want to show appreciation for websockify you could donate to a great
non-profits such as: [Compassion
International](http://www.compassion.com/), [SIL](http://www.sil.org),
[Habitat for Humanity](http://www.habitat.org), [Electronic Frontier
Foundation](https://www.eff.org/), [Against Malaria
Foundation](http://www.againstmalaria.com/), [Nothing But
Nets](http://www.nothingbutnets.net/), etc. Please tweet <a
href="http://www.twitter.com/noVNC">@noVNC</a> if you do.

### Encrypted WebSocket connections (wss://)

To encrypt the traffic using the WebSocket 'wss://' URI scheme you need to
generate a certificate and key for Websockify to load. The `--cert=CERT` and
`--key=KEY` options are used to specify the file name for the certificate and
key. You can generate a self-signed certificate using openssl. When asked for
the common name, use the hostname of the server where the proxy will be
running:

```
openssl req -new -x509 -days 365 -nodes -out self.pem -keyout self.pem
```

For a self-signed certificate to work, you need to make your client/browser
understand it. You can do this by installing it as accepted certificate, or by
using that same certificate for a HTTPS connection to which you navigate first
and approve. Browsers generally don't give you the "trust certificate?" prompt
by opening a WSS socket with invalid certificate, hence you need to have it
acccept it by either of those two methods.

If you have a commercial/valid SSL certificate with one or more intermediate
certificates, concat them into one file, server certificate first, then the
intermediate(s) from the CA, etc. Point to this file with the `--cert` option
and then also to the key with `--key`.


### Websock Javascript library


The `include/websock.js` Javascript library provides a Websock
object that is similar to the standard WebSocket object but Websock
enables communication with raw TCP sockets (i.e. the binary stream)
via websockify.

Websock has built-in receive queue buffering; the message event
does not contain actual data but is simply a notification that
there is new data available. Several rQ* methods are available to
read binary data off of the receive queue.

The Websock API is documented on the [websock.js API wiki
page](https://github.com/novnc/websockify-js/wiki/websock.js).
