import {browser} from '$app/environment';
import os from 'os';
import dotenv from 'dotenv';
import * as skio from 'sveltekit-io';
import axios from 'axios';

if (!browser) {
  dotenv.config(); // Bun does not load .env files automatically
}

function getSocketsHttpMode() {
  const SOCKETS_USE_HTTPS = process.env.SOCKETS_HTTP_MODE;
  const useHttps = !!SOCKETS_USE_HTTPS ? !!Number.parseInt(SOCKETS_USE_HTTPS) : undefined;
  if (useHttps !== undefined) {
    console.log("SOCKETS_HTTP_MODE set:", SOCKETS_USE_HTTPS);
    return useHttps ? "https" : "http";
  }
  console.log("SOCKETS_USE_HTTPS not set, defaulting to: http");
  return "http";
}

function getSocketsHostIP() {
  const SOCKETS_HOST = process.env.SOCKETS_HOST;
  if (SOCKETS_HOST) {
    console.log("SOCKETS_HOST set:", SOCKETS_HOST);
    return SOCKETS_HOST;
  }
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        console.log(`SOCKETS_HOST not set, default to local IPv4 address: ${iface.address} on interface ${name}`);
        return iface.address;
      }
    }
  }
  console.log("SOCKETS_HOST not set, could not determine local IPv4 address, defaulting to: localhost");
  return "localhost";
}

function getSocketsPort() {
  const SOCKETS_PORT = process.env.SOCKETS_PORT;
  if (SOCKETS_PORT) {
    console.log("SOCKETS_PORT set:", SOCKETS_PORT);
    return SOCKETS_PORT;
  }
  console.log("SOCKETS_PORT not set, defaulting to: 3001");
  return "3001";
}

let socketsHost: string | undefined = undefined;

function setSocketEndpoint() {
  socketsHost = `${getSocketsHttpMode()}://${getSocketsHostIP()}:${getSocketsPort()}`;
}

if (!browser) {
  setSocketEndpoint();
  process.env.PUBLIC_SOCKETS_ENDPOINT = socketsHost;
}

export async function loadSockets() {
  if (browser) {
    const res = await axios.get("/api/sockets-endpoint");
    socketsHost = res.data.endpoint;
  }

  if (!socketsHost) {
    console.error("socketsHost is undefined, cannot initialize sockets.");
    return;
  }

  skio.setup(socketsHost, {
    cors: {
      origin: "*",
      credentials: false,
    },
    maxHttpBufferSize: 1e8,
  }).then((io: any) => {
    if (typeof io.to !== "function") {
      io.to = () => ({ emit: () => {} });
    }
    if (browser) return;
    import("./lib/server/sockets").then(({ connectSockets }) => {
      connectSockets(io);
    });
    console.log("Sockets initialized with endpoint:", process.env.PUBLIC_SOCKETS_ENDPOINT);
  });
}