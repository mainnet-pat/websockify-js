FROM node:16

WORKDIR /websockify
COPY websockify /websockify
RUN yarn
ENTRYPOINT ["/websockify/websockify.js"]
CMD ["0.0.0.0:8333"]