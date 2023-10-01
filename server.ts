import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";
const app = new Application();
const port = 8000;

/*
  ----- SERVER SETTINGS -----
  10: Defines the mode of gameplay.
  19: Enable/disable PvP on the server.
  26: The maximum number of players that can play on the server.
  36: The "level-name" value is used as the world name and its folder name.
  49: Enable remote access to the server console.

  SERVER_IP : Set server IP (ex. 127.0.0.1:25565)
  SERVER_RAM: Set server ram in MB (1 GB = 1024 MB)
 */

const availableSettings = [10, 19, 36, 26, 49];
const SERVER_IP = "192.168.1.232:25565";
const SERVER_RAM = "2048";

app.use(
  oakCors({
    origin: "*",
  })
);

const router = new Router();
const encoder = new TextEncoder();

let gameConsole: any;

const serverStatus = {status: false};

router
  .get("/server/status", (ctx) => {
    ctx.response.body = { serverStatus, ip: SERVER_IP };
  })
  .get("/server/start", (ctx) => {
    initialServer().then(() => ctx.response.body = serverStatus);
  })
  .get("/server/stop", (ctx) => {
    stopServer().then(() => ctx.response.body = serverStatus);
  })
  .post("/server/command", async (ctx) => {
    if (gameConsole) {
      const values = await ctx.request.body().value;

      // Check if command
      if (!values.command.startsWith("/")) {
        values.command = "/" + values.command;
      }

      // Write to console
      await gameConsole.stdin.write(encoder.encode(values.command + "\n"));
    }
  })
  .post("/server/settings", async (ctx) => {
    const postvalue = await ctx.request.body().value;
    await settings(postvalue.settings);
  })
  .get("/server/settings/get", async (ctx) => {
    ctx.response.body = await getSettings();
  });

async function settings(value: any) {
  const text = await Deno.readTextFile("server.properties");
  let textSplit = text.split("\n");
  for (const settingIndex of availableSettings) {
    const [key, _] = textSplit[settingIndex].split("=");
    textSplit[settingIndex] = `${key}=${value[settingIndex]}`;
  }

  const writetext = textSplit.slice(0, -1).join('\n');

  await Deno.remove("server.properties");
  await Deno.create("server.properties");

  const write = Deno.writeTextFile("server.properties", writetext);
  write.then(() => console.log("changes has been made"));
}

async function getSettings() {
  const serverProperties = await Deno.readTextFile("server.properties");

  const textSplit = serverProperties.split("\n");

  const settings = availableSettings.reduce((acc, settingIndex, index) => {
    const [_, value] = textSplit[settingIndex].split("=");
    const settingName = Object.keys(acc)[index];
    return { ...acc, [settingName]: value };
  }, {});

  return settings;
}

async function stopServer(){
  if (gameConsole) {
    serverStatus.status = false;
    try {
      await gameConsole.stdin.write(encoder.encode("/stop"));
    } catch {
      console.log("closing the server failed");
    }
    await gameConsole.stdin.close();
    console.log("Server closed.")
  }
}

async function initialServer() {
  if (!serverStatus.status) {
    serverStatus.status = true;
    gameConsole = Deno.run({
      cmd: ["java", "-Xmx" + SERVER_RAM + "M", "-Xms" + SERVER_RAM + "M", "-jar", "server.jar", "nogui"],
      stdout: "piped",
      stdin: "piped",
      stderr: "piped",
    });

    Deno.copy(gameConsole.stdout, Deno.stdout);
  }
}

app.use(async (ctx, next) => {
  await next();
  console.log(`${ctx.request.method} ${ctx.request.url}`);
});

app.use(router.routes());
app.use(router.allowedMethods());

app.listen({ port });
console.log(`localhost:${port}`);
