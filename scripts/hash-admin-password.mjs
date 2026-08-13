import { stdin, stdout } from "node:process";
import { webcrypto } from "node:crypto";

globalThis.crypto ??= webcrypto;
if (!stdin.isTTY || typeof stdin.setRawMode !== "function") throw new Error("Execute este comando em um terminal interativo.");
stdout.write("Digite a senha administrativa: ");
stdin.setRawMode(true); stdin.resume(); stdin.setEncoding("utf8");
const password = await new Promise((resolve, reject) => {
  let value = "";
  stdin.on("data", character => {
    if (character === "\u0003") reject(new Error("Operação cancelada."));
    else if (character === "\r" || character === "\n") resolve(value);
    else if (character === "\u007f") value = value.slice(0, -1);
    else value += character;
  });
});
stdin.setRawMode(false); stdin.pause();
if (password.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
const salt = crypto.getRandomValues(new Uint8Array(16));
const encode = bytes => Buffer.from(bytes).toString("base64url");
const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 210000 }, key, 256);
stdout.write(`\n${`pbkdf2-sha256$210000$${encode(salt)}$${encode(new Uint8Array(bits))}`}\n`);
