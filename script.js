"use strict";

const editor = document.getElementById("editor");
const consoleEl = document.getElementById("console");
const runBtn = document.getElementById("runBtn");
const clearBtn = document.getElementById("clearBtn");
const examplesBtn = document.getElementById("examplesBtn");

const PROMPT = "›";

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatArg(value, seen) {
  seen = seen || new Set();
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  const type = typeof value;
  if (type === "string") return value;
  if (type === "number" || type === "bigint" || type === "boolean") return String(value);
  if (type === "symbol") return value.toString();
  if (type === "function") {
    const name = value.name || "anonymous";
    return `[Function: ${name}]`;
  }
  if (type === "object") {
    if (seen.has(value)) return "[Circular]";
    seen.add(value);
    try {
      if (value instanceof Error) return `${value.name}: ${value.message}`;
      if (Array.isArray(value)) {
        const items = value.map((v) => formatArg(v, seen));
        return "[ " + items.join(", ") + (value.length > 0 ? " " : "") + "]";
      }
      if (value instanceof Map) {
        const entries = [...value.entries()].map(
          ([k, v]) => `${formatArg(k, seen)} => ${formatArg(v, seen)}`
        );
        return `Map(${value.size}) { ${entries.join(", ")} }`;
      }
      if (value instanceof Set) {
        const entries = [...value.values()].map((v) => formatArg(v, seen));
        return `Set(${value.size}) { ${entries.join(", ")} }`;
      }
      if (value instanceof Date) return value.toISOString();
      if (value instanceof RegExp) return value.toString();
      const keys = Object.keys(value);
      const pairs = keys.map(
        (k) => `${k}: ${formatArg(value[k], seen)}`
      );
      const ctor = value.constructor && value.constructor.name
        ? value.constructor.name
        : "Object";
      if (pairs.length === 0) return ctor === "Object" ? "{}" : `${ctor} {}`;
      return ctor === "Object"
        ? "{ " + pairs.join(", ") + " }"
        : `${ctor} { ${pairs.join(", ")} }`;
    } catch (e) {
      return "[object]";
    }
  }
  return String(value);
}

function appendLine(text, className) {
  const div = document.createElement("div");
  div.className = "line " + (className || "");
  const prompt = document.createElement("span");
  prompt.className = "prompt";
  prompt.textContent = PROMPT;
  div.appendChild(prompt);
  const span = document.createElement("span");
  span.innerHTML = escapeHtml(text);
  div.appendChild(span);
  consoleEl.appendChild(div);
  consoleEl.scrollTop = consoleEl.scrollHeight;
  return div;
}

function appendRaw(text, className) {
  const div = document.createElement("div");
  div.className = "line " + (className || "");
  div.innerHTML = escapeHtml(text);
  consoleEl.appendChild(div);
  consoleEl.scrollTop = consoleEl.scrollHeight;
  return div;
}

function clearConsole() {
  consoleEl.innerHTML = "";
}

function makeConsole() {
  const formatArgs = (args) => args.map((a) => formatArg(a)).join(" ");
  const c = {
    log: (...args) => appendLine(formatArgs(args), "console-line"),
    info: (...args) => appendLine(formatArgs(args), "console-info"),
    debug: (...args) => appendLine(formatArgs(args), "console-line"),
    warn: (...args) => appendLine(formatArgs(args), "console-warn"),
    error: (...args) => appendLine(formatArgs(args), "console-error"),
    table: (data) => {
      try {
        if (Array.isArray(data)) {
          data.forEach((row, i) =>
            appendLine(`${i}: ${formatArg(row)}`, "console-line")
          );
        } else if (data && typeof data === "object") {
          Object.entries(data).forEach(([k, v]) =>
            appendLine(`${k}: ${formatArg(v)}`, "console-line")
          );
        } else {
          appendLine(formatArg(data), "console-line");
        }
      } catch (e) {
        c.log(data);
      }
    },
    group: (...args) => appendLine(formatArgs(args) || "Group", "console-info"),
    groupEnd: () => {},
    time: () => {},
    timeEnd: () => {},
    assert: (cond, ...args) => {
      if (!cond) c.error("Assertion failed:", ...args);
    },
    dir: (obj) => appendLine(formatArg(obj), "console-line"),
    count: () => {},
    trace: (...args) => appendLine(formatArgs(args), "console-info"),
    clear: clearConsole,
  };
  return c;
}

function runCode() {
  const code = editor.value;
  clearConsole();
  const sandboxConsole = makeConsole();

  try {
    const runner = new Function("console", '"use strict";\n' + code);
    runner(sandboxConsole);
  } catch (err) {
    appendLine(`${err.name}: ${err.message}`, "console-error");
    if (err.stack) {
      const stack = err.stack.split("\n").slice(1, 4).join("\n");
      if (stack) appendRaw(stack, "console-error");
    }
  }
}

const EXAMPLES = {
  "Hola mundo": `// Hola mundo
console.log("Hola, alumnos!");
console.log("Bienvenidos al módulo de Desarrollo Web en Entorno Cliente");`,

  "Variables y tipos": `// Variables y tipos de datos
let nombre = "Ana";
const edad = 20;
let activo = true;
let nada = null;
let noDefinido;

console.log(nombre, "-", typeof nombre);
console.log(edad, "-", typeof edad);
console.log(activo, "-", typeof activo);
console.log(nada, "-", typeof nada);
console.log(noDefinido, "-", typeof noDefinido);`,

  "Operaciones aritméticas": `// Operaciones básicas
let a = 10;
let b = 3;

console.log("Suma:", a + b);
console.log("Resta:", a - b);
console.log("Multiplicación:", a * b);
console.log("División:", a / b);
console.log("Resto:", a % b);
console.log("Potencia:", a ** b);`,

  "Estructuras de control": `// Condicionales y bucles
let nota = 7;

if (nota >= 9) {
  console.log("Sobresaliente");
} else if (nota >= 5) {
  console.log("Aprobado");
} else {
  console.log("Suspenso");
}

console.log("--- Contando del 1 al 5 ---");
for (let i = 1; i <= 5; i++) {
  console.log("i =", i);
}`,

  "Arrays": `// Arrays
let frutas = ["manzana", "pera", "naranja"];

console.log("Array completo:", frutas);
console.log("Primer elemento:", frutas[0]);
console.log("Número de elementos:", frutas.length);

frutas.push("uva");
console.log("Tras push:", frutas);

frutas.forEach((fruta, i) => console.log(i, "->", fruta));`,

  "Objetos": `// Objetos
let alumno = {
  nombre: "Carlos",
  edad: 21,
  modulo: "DAW",
  activo: true
};

console.log(alumno);
console.log("Nombre:", alumno.nombre);
console.log("Edad:", alumno["edad"]);

alumno.nota = 8;
console.log("Objeto actualizado:", alumno);`,

  "Funciones": `// Funciones
function saludar(nombre) {
  return "Hola, " + nombre + "!";
}

const sumar = (a, b) => a + b;

console.log(saludar("María"));
console.log("2 + 3 =", sumar(2, 3));

// Recursividad: factorial
function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

console.log("5! =", factorial(5));`,

  "Manejo de errores": `// try / catch
try {
  let x = y + 1; // 'y' no está definida
} catch (error) {
  console.error("Capturado un error:", error.message);
}

console.log("La ejecución continúa normalmente");`,
};

function showExamples() {
  const names = Object.keys(EXAMPLES);
  const msg =
    "Elige un ejemplo por número:\n\n" +
    names.map((n, i) => `${i + 1}. ${n}`).join("\n") +
    "\n\n(Cancelar = vacío)";
  const choice = prompt(msg);
  if (choice === null || choice.trim() === "") return;
  const idx = parseInt(choice.trim(), 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= names.length) {
    appendRaw("Selección no válida.", "console-error");
    return;
  }
  editor.value = EXAMPLES[names[idx]];
  runCode();
}

editor.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.value =
      editor.value.slice(0, start) + "  " + editor.value.slice(end);
    editor.selectionStart = editor.selectionEnd = start + 2;
  }
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    runCode();
  }
});

runBtn.addEventListener("click", runCode);
clearBtn.addEventListener("click", clearConsole);
examplesBtn.addEventListener("click", showExamples);

editor.value = `// Escribe código JavaScript a la izquierda
// y pulsa "Ejecutar" (o Ctrl+Enter).
// El resultado aparecerá aquí a la derecha, como en Node.js.

let mensaje = "Hola, alumnos";
console.log(mensaje);

let a = 6, b = 7;
console.log("La suma es", a + b);
`;

runCode();
