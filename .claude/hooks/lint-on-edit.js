// PostToolUse hook for Write|Edit: lint the touched JavaScript file with the
// project's ESLint config. Report-only — never passes --fix, never rewrites.
//
// Exit codes: 0 = nothing to report (or skipped), 2 = lint problems, sent to
// Claude via stderr so it can react.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const JS_EXTENSIONS = new Set(['.js', '.cjs', '.mjs']);

function readInput() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8'));
  } catch {
    return null;
  }
}

function main() {
  const input = readInput();
  const filePath = input && input.tool_input && input.tool_input.file_path;
  if (!filePath) return 0;

  // Markdown, JSON and anything else that isn't JavaScript is skipped.
  if (!JS_EXTENSIONS.has(path.extname(filePath).toLowerCase())) return 0;

  const projectDir = process.env.CLAUDE_PROJECT_DIR || (input && input.cwd) || process.cwd();
  const absFile = path.resolve(projectDir, filePath);
  const relFile = path.relative(projectDir, absFile);

  // Outside the project, or inside node_modules: not ours to lint.
  if (relFile.startsWith('..') || path.isAbsolute(relFile)) return 0;
  if (relFile.split(path.sep).includes('node_modules')) return 0;
  if (!fs.existsSync(absFile)) return 0;

  // Call ESLint through node directly: avoids .cmd shims and shell quoting on Windows.
  const eslintBin = path.join(projectDir, 'node_modules', 'eslint', 'bin', 'eslint.js');
  if (!fs.existsSync(eslintBin)) {
    console.error('lint hook: eslint is not installed (run npm install); skipping.');
    return 0;
  }

  // --no-warn-ignored: files the config does not cover are skipped silently.
  const result = spawnSync(
    process.execPath,
    [eslintBin, '--no-warn-ignored', '--max-warnings', '0', '--', relFile],
    { cwd: projectDir, encoding: 'utf8' },
  );

  if (result.error) {
    console.error(`lint hook: could not run eslint: ${result.error.message}`);
    return 0;
  }
  if (result.status === 0) return 0;

  // 1 = lint problems, 2 = ESLint config/runtime error; both are worth surfacing.
  console.error(`ESLint found problems in ${relFile} (report only, nothing was changed):`);
  console.error((result.stdout || '') + (result.stderr || ''));
  return 2;
}

process.exit(main());
