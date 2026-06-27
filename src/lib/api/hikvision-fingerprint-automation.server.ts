import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import WebSocket, { type RawData } from "ws";

type FingerprintAutomationInput = {
  baseUrl: string;
  username: string;
  password: string;
  employeeNumber: string;
};

type AutomationResult = {
  ok: boolean;
  message: string;
  editUrl?: string;
};

type PendingCommand = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

type LoginDiagnostics = {
  usernameFound?: boolean;
  passwordFound?: boolean;
  loginButtonFound?: boolean;
  usernameLength?: number;
  passwordLength?: number;
  errorText?: string;
  hash?: string;
};

const debugPort = 9339;

export async function startFingerprintAutomation(
  input: FingerprintAutomationInput,
): Promise<AutomationResult> {
  const baseUrl = input.baseUrl.replace(/\/$/, "");
  const employeeNumber = input.employeeNumber.trim().toUpperCase();
  const loginUrl = `${baseUrl}/doc/index.html#/portal/login`;
  const editUrl = `${baseUrl}/doc/index.html#/peopleManage/addEditPeople?employeeNo=${encodeURIComponent(
    employeeNumber,
  )}&pageNumber=1&groupPageNumber=1&viewMode=card&currentGroupId=all&type=edit`;

  await ensureBrowser(loginUrl);

  const browserWsUrl = await waitForBrowserWsUrl();
  const cdp = await CdpClient.connect(browserWsUrl);
  try {
    const target = (await cdp.send("Target.createTarget", { url: loginUrl })) as {
      targetId: string;
    };
    const attached = (await cdp.send("Target.attachToTarget", {
      targetId: target.targetId,
      flatten: true,
    })) as { sessionId: string };
    const sessionId = attached.sessionId;

    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Runtime.enable", {}, sessionId);
    await waitForReady(cdp, sessionId);

    const alreadyLoggedIn = await isLoggedIn(cdp, sessionId);
    if (!alreadyLoggedIn) {
      await login(cdp, sessionId, input.username, input.password);
    }

    await cdp.send("Page.navigate", { url: editUrl }, sessionId);
    await waitForReady(cdp, sessionId);
    await waitForEmployeePage(cdp, sessionId, employeeNumber);

    const clicked = await clickAddFingerprint(cdp, sessionId);
    if (!clicked) {
      return {
        ok: false,
        editUrl,
        message:
          "Opened the employee page, but could not find the Add Fingerprint button. Use the opened Hikvision tab as fallback.",
      };
    }

    return {
      ok: true,
      editUrl,
      message:
        "Hikvision employee page opened and Add Fingerprint was clicked. Put the finger on the physical scanner now.",
    };
  } finally {
    cdp.close();
  }
}

async function ensureBrowser(url: string) {
  if (await canReachDebugPort()) return;

  const browserPath = findBrowserPath();
  if (!browserPath) {
    throw new Error("Chrome or Microsoft Edge was not found on this computer.");
  }

  const profileDir = join(tmpdir(), "fitfyt-hikvision-automation-profile");
  mkdirSync(profileDir, { recursive: true });

  const child = spawn(
    browserPath,
    [
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profileDir}`,
      "--ignore-certificate-errors",
      "--allow-insecure-localhost",
      "--new-window",
      url,
    ],
    {
      detached: true,
      stdio: "ignore",
      windowsHide: false,
    },
  );
  child.unref();
}

async function canReachDebugPort() {
  try {
    const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForBrowserWsUrl() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      if (response.ok) {
        const data = (await response.json()) as { webSocketDebuggerUrl?: string };
        if (data.webSocketDebuggerUrl) return data.webSocketDebuggerUrl;
      }
    } catch {
      // Browser is still starting.
    }
    await delay(300);
  }

  throw new Error("Chrome automation did not start in time.");
}

function findBrowserPath() {
  const candidates = [
    process.env.PROGRAMFILES
      ? join(process.env.PROGRAMFILES, "Google", "Chrome", "Application", "chrome.exe")
      : "",
    process.env["PROGRAMFILES(X86)"]
      ? join(process.env["PROGRAMFILES(X86)"], "Google", "Chrome", "Application", "chrome.exe")
      : "",
    process.env.LOCALAPPDATA
      ? join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe")
      : "",
    process.env.PROGRAMFILES
      ? join(process.env.PROGRAMFILES, "Microsoft", "Edge", "Application", "msedge.exe")
      : "",
    process.env["PROGRAMFILES(X86)"]
      ? join(process.env["PROGRAMFILES(X86)"], "Microsoft", "Edge", "Application", "msedge.exe")
      : "",
  ];

  return candidates.find((candidate) => candidate && existsSync(candidate));
}

async function login(cdp: CdpClient, sessionId: string, username: string, password: string) {
  const formReady = await waitForTruthy(cdp, sessionId, loginFormReadyScript, 12000);
  if (!formReady) {
    const diagnostics = await getLoginDiagnostics(cdp, sessionId);
    throw new Error(`Could not find the Hikvision login form. ${formatLoginDiagnostics(diagnostics)}`);
  }

  const usernameFocused = await focusLoginField(cdp, sessionId, "username");
  const passwordFocused = await focusLoginField(cdp, sessionId, "password");
  if (!usernameFocused || !passwordFocused) {
    const diagnostics = await getLoginDiagnostics(cdp, sessionId);
    throw new Error(`Could not focus the Hikvision login fields. ${formatLoginDiagnostics(diagnostics)}`);
  }

  await focusLoginField(cdp, sessionId, "username");
  await clearFocusedInput(cdp, sessionId);
  await typeText(cdp, sessionId, username);
  await commitFocusedInput(cdp, sessionId);

  await focusLoginField(cdp, sessionId, "password");
  await clearFocusedInput(cdp, sessionId);
  await typeText(cdp, sessionId, password);
  await commitFocusedInput(cdp, sessionId);

  const loginClicked = await clickLoginButton(cdp, sessionId);
  if (!loginClicked) {
    const diagnostics = await getLoginDiagnostics(cdp, sessionId);
    throw new Error(`Could not click the Hikvision Login button. ${formatLoginDiagnostics(diagnostics)}`);
  }

  let loggedIn = await waitForTruthy(cdp, sessionId, loggedInScript, 12000);
  if (!loggedIn) {
    await submitLoginForm(cdp, sessionId);
    loggedIn = await waitForTruthy(cdp, sessionId, loggedInScript, 8000);
  }
  if (!loggedIn) {
    await focusLoginField(cdp, sessionId, "password");
    await pressEnter(cdp, sessionId);
    loggedIn = await waitForTruthy(cdp, sessionId, loggedInScript, 10000);
  }
  if (!loggedIn) {
    const diagnostics = await getLoginDiagnostics(cdp, sessionId);
    throw new Error(`Hikvision login did not complete. ${formatLoginDiagnostics(diagnostics)}`);
  }
}

async function isLoggedIn(cdp: CdpClient, sessionId: string) {
  return Boolean(await evaluate(cdp, sessionId, loggedInScript));
}

async function waitForReady(cdp: CdpClient, sessionId: string) {
  await waitForTruthy(
    cdp,
    sessionId,
    `document.readyState === "interactive" || document.readyState === "complete"`,
    15000,
  );
  await delay(1000);
}

async function waitForEmployeePage(cdp: CdpClient, sessionId: string, employeeNumber: string) {
  const visible = await waitForTruthy(
    cdp,
    sessionId,
    `document.body && document.body.innerText.includes(${JSON.stringify(employeeNumber)})`,
    15000,
  );
  if (!visible) {
    throw new Error(`Employee ${employeeNumber} page did not load in Hikvision.`);
  }
}

async function clickAddFingerprint(cdp: CdpClient, sessionId: string) {
  return Boolean(await waitForTruthy(cdp, sessionId, addFingerprintScript, 12000));
}

async function waitForTruthy(
  cdp: CdpClient,
  sessionId: string,
  expression: string,
  timeoutMs: number,
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await evaluate(cdp, sessionId, expression);
    if (value) return value;
    await delay(500);
  }
  return undefined;
}

async function evaluate(cdp: CdpClient, sessionId: string, expression: string) {
  const result = (await cdp.send(
    "Runtime.evaluate",
    {
      expression,
      awaitPromise: true,
      returnByValue: true,
    },
    sessionId,
  )) as { result?: { value?: unknown } };
  return result.result?.value;
}

async function focusLoginField(cdp: CdpClient, sessionId: string, field: "username" | "password") {
  return Boolean(await evaluate(cdp, sessionId, focusLoginFieldScript(field)));
}

async function clearFocusedInput(cdp: CdpClient, sessionId: string) {
  await cdp.send("Runtime.evaluate", {
    expression: `
(() => {
  if (!document.activeElement || !("value" in document.activeElement)) return false;
  const element = document.activeElement;
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), "value")?.set;
  if (setter) setter.call(element, "");
  else element.value = "";
  element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "deleteContentBackward", data: null }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
})()
`,
    awaitPromise: true,
    returnByValue: true,
  }, sessionId);

  await keyDown(cdp, sessionId, "Control", "ControlLeft", 17);
  await keyDown(cdp, sessionId, "a", "KeyA", 65);
  await keyUp(cdp, sessionId, "a", "KeyA", 65);
  await keyUp(cdp, sessionId, "Control", "ControlLeft", 17);
  await keyDown(cdp, sessionId, "Backspace", "Backspace", 8);
  await keyUp(cdp, sessionId, "Backspace", "Backspace", 8);
}

async function typeText(cdp: CdpClient, sessionId: string, text: string) {
  for (const char of text) {
    await cdp.send("Input.dispatchKeyEvent", {
      type: "char",
      text: char,
      unmodifiedText: char,
    }, sessionId);
    await delay(35);
  }
}

async function commitFocusedInput(cdp: CdpClient, sessionId: string) {
  await cdp.send("Runtime.evaluate", {
    expression: `
(() => {
  const element = document.activeElement;
  if (!element) return false;
  element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: element.value || "" }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  element.dispatchEvent(new Event("blur", { bubbles: true }));
  return true;
})()
`,
    awaitPromise: true,
    returnByValue: true,
  }, sessionId);
}

async function clickLoginButton(cdp: CdpClient, sessionId: string) {
  const button = (await evaluate(cdp, sessionId, loginButtonCenterScript)) as
    | { found: true; x: number; y: number }
    | { found: false }
    | undefined;
  if (!button?.found) return false;

  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: button.x,
    y: button.y,
  }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: button.x,
    y: button.y,
    button: "left",
    clickCount: 1,
  }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: button.x,
    y: button.y,
    button: "left",
    clickCount: 1,
  }, sessionId);
  return true;
}

async function submitLoginForm(cdp: CdpClient, sessionId: string) {
  return Boolean(await evaluate(cdp, sessionId, submitLoginScript));
}

async function keyDown(
  cdp: CdpClient,
  sessionId: string,
  key: string,
  code: string,
  windowsVirtualKeyCode: number,
) {
  await cdp.send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key,
    code,
    windowsVirtualKeyCode,
    nativeVirtualKeyCode: windowsVirtualKeyCode,
  }, sessionId);
}

async function keyUp(
  cdp: CdpClient,
  sessionId: string,
  key: string,
  code: string,
  windowsVirtualKeyCode: number,
) {
  await cdp.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key,
    code,
    windowsVirtualKeyCode,
    nativeVirtualKeyCode: windowsVirtualKeyCode,
  }, sessionId);
}

async function pressEnter(cdp: CdpClient, sessionId: string) {
  await cdp.send("Input.dispatchKeyEvent", {
    type: "keyDown",
    windowsVirtualKeyCode: 13,
    nativeVirtualKeyCode: 13,
    code: "Enter",
    key: "Enter",
    text: "\r",
    unmodifiedText: "\r",
  }, sessionId);
  await cdp.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    windowsVirtualKeyCode: 13,
    nativeVirtualKeyCode: 13,
    code: "Enter",
    key: "Enter",
  }, sessionId);
}

async function getLoginDiagnostics(cdp: CdpClient, sessionId: string) {
  return ((await evaluate(cdp, sessionId, loginDiagnosticsScript)) ?? {}) as LoginDiagnostics;
}

function formatLoginDiagnostics(diagnostics: LoginDiagnostics) {
  const pieces = [
    `username field=${diagnostics.usernameFound ? "found" : "missing"}`,
    `password field=${diagnostics.passwordFound ? "found" : "missing"}`,
    `login button=${diagnostics.loginButtonFound ? "found" : "missing"}`,
  ];

  if (typeof diagnostics.usernameLength === "number") {
    pieces.push(`username chars=${diagnostics.usernameLength}`);
  }
  if (typeof diagnostics.passwordLength === "number") {
    pieces.push(`password chars=${diagnostics.passwordLength}`);
  }
  if (diagnostics.errorText) {
    pieces.push(`message="${diagnostics.errorText}"`);
  }
  if (diagnostics.hash) {
    pieces.push(`page=${diagnostics.hash}`);
  }

  return pieces.join("; ");
}

function focusLoginFieldScript(field: "username" | "password") {
  return `
(() => {
  const isVisible = (element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  };
  const inputs = Array.from(document.querySelectorAll("input"));
  const usernameInput =
    inputs.find((input) => isVisible(input) && /user|name|account/i.test(input.placeholder || input.name || input.id || "")) ||
    inputs.find((input) => isVisible(input) && input.type !== "password") ||
    inputs[0];
  const passwordInput =
    inputs.find((input) => isVisible(input) && input.type === "password") ||
    inputs[1];
  const target = ${JSON.stringify(field)} === "username" ? usernameInput : passwordInput;
  if (!target) return false;
  target.scrollIntoView({ block: "center", inline: "center" });
  target.focus();
  target.click();
  return document.activeElement === target;
})()
`;
}

const loginFormReadyScript = `
(() => {
  const inputs = Array.from(document.querySelectorAll("input"));
  return inputs.length >= 2 && inputs.some((input) => input.type === "password");
})()
`;

const loginButtonCenterScript = `
(() => {
  const isVisible = (element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  };
  const buttons = Array.from(document.querySelectorAll("button, [role=button], input[type=button], input[type=submit]"));
  const loginButton =
    buttons.find((button) => isVisible(button) && /login|log in|sign in/i.test(button.innerText || button.value || "")) ||
    buttons.find((button) => button.type === "submit") ||
    buttons.find(isVisible);
  if (!loginButton) return { found: false };
  const rect = loginButton.getBoundingClientRect();
  return { found: true, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
})()
`;

const submitLoginScript = `
(() => {
  const isVisible = (element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  };
  const buttons = Array.from(document.querySelectorAll("button, [role=button], input[type=button], input[type=submit]"));
  const loginButton =
    buttons.find((button) => isVisible(button) && /login|log in|sign in/i.test(button.innerText || button.value || "")) ||
    buttons.find((button) => button.type === "submit") ||
    buttons.find(isVisible);
  if (!loginButton) return false;

  const inputs = Array.from(document.querySelectorAll("input"));
  inputs.forEach((input) => {
    input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: input.value || "" }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new Event("blur", { bubbles: true }));
  });

  loginButton.removeAttribute?.("disabled");
  loginButton.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, cancelable: true, view: window }));
  loginButton.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
  loginButton.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
  loginButton.click();

  const form = loginButton.closest?.("form") || inputs[0]?.closest?.("form");
  if (form?.requestSubmit) form.requestSubmit();
  else form?.dispatchEvent?.(new Event("submit", { bubbles: true, cancelable: true }));
  return true;
})()
`;

const loginDiagnosticsScript = `
(() => {
  const isVisible = (element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  };
  const inputs = Array.from(document.querySelectorAll("input"));
  const usernameInput =
    inputs.find((input) => isVisible(input) && /user|name|account/i.test(input.placeholder || input.name || input.id || "")) ||
    inputs.find((input) => isVisible(input) && input.type !== "password") ||
    inputs[0];
  const passwordInput =
    inputs.find((input) => isVisible(input) && input.type === "password") ||
    inputs[1];
  const buttons = Array.from(document.querySelectorAll("button, [role=button], input[type=button], input[type=submit]"));
  const loginButton =
    buttons.find((button) => isVisible(button) && /login|log in|sign in/i.test(button.innerText || button.value || "")) ||
    buttons.find((button) => button.type === "submit") ||
    buttons.find(isVisible);
  const visibleText = (document.body?.innerText || "").replace(/\\s+/g, " ").trim();
  const errorMatch = visibleText.match(/(?:invalid|incorrect|failed|failure|error|locked|password|user name|username)[^.。\\n]{0,120}/i);
  return {
    usernameFound: Boolean(usernameInput),
    passwordFound: Boolean(passwordInput),
    loginButtonFound: Boolean(loginButton),
    usernameLength: usernameInput?.value?.length ?? 0,
    passwordLength: passwordInput?.value?.length ?? 0,
    errorText: errorMatch?.[0] ?? "",
    hash: location.hash,
  };
})()
`;

const loggedInScript = `
(() => {
  const text = document.body?.innerText || "";
  return location.hash.includes("dashboard") ||
    location.hash.includes("peopleManage") ||
    /person management|overview|remote: logout|admin/i.test(text);
})()
`;

const addFingerprintScript = `
(() => {
  window.scrollTo(0, document.body.scrollHeight);
  const visible = (element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
  };
  const elements = Array.from(document.querySelectorAll("button, a, div, span"));
  const addFingerprint = elements.find((element) => {
    const text = (element.innerText || element.textContent || "").replace(/\\s+/g, " ").trim();
    return visible(element) && /^\\+?\\s*Add Fingerprint$/i.test(text);
  });
  if (!addFingerprint) return false;
  addFingerprint.scrollIntoView({ block: "center", inline: "center" });
  ["mouseover", "mousedown", "mouseup", "click"].forEach((type) =>
    addFingerprint.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window })),
  );
  return true;
})()
`;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CdpClient {
  private nextId = 1;
  private readonly pending = new Map<number, PendingCommand>();

  private constructor(private readonly socket: WebSocket) {
    socket.on("message", (data: RawData) => {
      const message = JSON.parse(data.toString()) as {
        id?: number;
        result?: unknown;
        error?: unknown;
      };
      if (!message.id) return;

      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);

      if (message.error) pending.reject(message.error);
      else pending.resolve(message.result);
    });
  }

  static async connect(url: string) {
    const socket = new WebSocket(url);
    await new Promise<void>((resolve, reject) => {
      socket.once("open", () => resolve());
      socket.once("error", () => reject(new Error("Could not connect to Chrome.")));
    });
    return new CdpClient(socket);
  }

  send(method: string, params: Record<string, unknown> = {}, sessionId?: string) {
    const id = this.nextId++;
    const payload = sessionId ? { id, method, params, sessionId } : { id, method, params };
    this.socket.send(JSON.stringify(payload));

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (!this.pending.has(id)) return;
        this.pending.delete(id);
        reject(new Error(`Chrome command timed out: ${method}`));
      }, 20000);
    });
  }

  close() {
    this.socket.close();
  }
}
