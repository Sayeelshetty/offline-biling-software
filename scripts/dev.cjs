const net = require("net");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const { concurrently } = require("concurrently");

const rootDirectory = path.resolve(__dirname, "..");
const serverDirectory = path.join(rootDirectory, "server");
const serverEnvPath = path.join(serverDirectory, ".env");

function readServerEnvValue(name) {
  if (process.env[name]) {
    return process.env[name];
  }

  if (!fs.existsSync(serverEnvPath)) {
    return undefined;
  }

  const line = fs
    .readFileSync(serverEnvPath, "utf8")
    .split(/\r?\n/)
    .find((entry) =>
      new RegExp(`^\\s*${name}\\s*=`).test(entry)
    );

  if (!line) {
    return undefined;
  }

  const value = line.slice(line.indexOf("=") + 1).trim();
  return value.replace(/^(['"])(.*)\1$/, "$2");
}

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", reject);

    server.listen(0, "127.0.0.1", () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not determine an available dev port."));
        return;
      }

      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(address.port);
      });
    });
  });
}

function isPortInUse(port) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(
      { host: "127.0.0.1", port },
      () => {
        socket.destroy();
        resolve(true);
      }
    );

    socket.once("error", (error) => {
      socket.destroy();

      if (error.code === "ECONNREFUSED") {
        resolve(false);
        return;
      }

      reject(error);
    });

    socket.setTimeout(1000, () => {
      socket.destroy();
      resolve(true);
    });
  });
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForCloudApi(url, serverProcess, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline && serverProcess.exitCode === null) {
    try {
      const response = await fetch(`${url}/health`, {
        signal: AbortSignal.timeout(1000),
      });

      if (response.ok) {
        return true;
      }
    } catch {
      // The server may still be starting up.
    }

    await wait(250);
  }

  return false;
}

async function startLocalCloudApi() {
  const explicitlyConfiguredUrl =
    process.env.CLOUD_API_URL ||
    process.env.VITE_CLOUD_API_URL;
  const configuredDatabaseUrl =
    readServerEnvValue("DATABASE_URL");
  const port = Number(readServerEnvValue("PORT") || 5000);
  const url =
    explicitlyConfiguredUrl ||
    `http://localhost:${port}`;

  if (explicitlyConfiguredUrl || !configuredDatabaseUrl) {
    if (!configuredDatabaseUrl && !explicitlyConfiguredUrl) {
      console.warn(
        "[cloud-api] Local cloud API not started: DATABASE_URL is not configured in server/.env."
      );
    }

    return { process: null, url };
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("The cloud API PORT must be a valid TCP port.");
  }

  if (await isPortInUse(port)) {
    console.log(
      `[cloud-api] Port ${port} is already in use; using the existing service at ${url}.`
    );
    return { process: null, url };
  }

  console.log("[cloud-api] Starting the configured local cloud API.");

  const serverProcess = spawn(
    process.execPath,
    ["server.js"],
    {
      cwd: serverDirectory,
      env: process.env,
      stdio: "inherit",
    }
  );

  serverProcess.on("error", (error) => {
    console.error("[cloud-api] Failed to start the local cloud API:", error);
  });

  const ready = await waitForCloudApi(url, serverProcess);

  if (ready) {
    console.log(`[cloud-api] Ready at ${url}.`);
  } else {
    console.warn(
      "[cloud-api] Cloud API did not become ready; desktop billing will still start offline."
    );
  }

  return { process: serverProcess, url };
}

function stopChild(child) {
  if (child && child.exitCode === null) {
    child.kill();
  }
}

async function startDevelopment() {
  const port = await findAvailablePort();
  const devServerUrl = `http://127.0.0.1:${port}`;
  const cloudApi = await startLocalCloudApi();

  console.log(`Starting Vite at ${devServerUrl}`);

  try {
    const { result } = concurrently(
      [
        {
          command:
            `npm --prefix frontend run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
          name: "vite",
        },
        {
          command:
            `wait-on ${devServerUrl} && electron electron/main.cjs`,
          name: "electron",
          env: {
            ...process.env,
            VITE_DEV_SERVER_URL: devServerUrl,
            CLOUD_API_URL: cloudApi.url,
          },
        },
      ],
      {
        cwd: rootDirectory,
        handleInput: true,
        killOthersOn: ["failure"],
        prefix: "[{name}]",
      }
    );

    const events = await result;
    const failed = events.some(
      (event) => event.exitCode !== 0
    );

    process.exitCode = failed ? 1 : 0;
  } finally {
    stopChild(cloudApi.process);
  }
}

module.exports = {
  findAvailablePort,
  isPortInUse,
  readServerEnvValue,
  startLocalCloudApi,
};

if (require.main === module) {
  startDevelopment().catch((error) => {
    console.error("Failed to start development services:", error);
    process.exitCode = 1;
  });
}
