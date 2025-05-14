import ncadapter from "./adapter/index.js";

const nc = new ncadapter({
  baseUrl: "ws://127.0.0.1:2958",
});

nc.init()