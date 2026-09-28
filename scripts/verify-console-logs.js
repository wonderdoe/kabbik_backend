'use strict';

const fs = require('fs');
const path = require('path');
const acorn = require('acorn');
const walk = require('acorn-walk');

const ROOT = path.resolve(__dirname, '..');
const EXTENSIONS = new Set(['.js', '.ts', '.jsx', '.tsx']);
const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'graphify-out',
  'dist',
  'build',
  'coverage',
  'scripts',
]);

function collectFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, files);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (EXTENSIONS.has(ext)) {
      files.push(fullPath);
    }
  }
  return files;
}

function isConsoleLogCall(node) {
  return (
    node &&
    node.type === 'CallExpression' &&
    node.callee &&
    node.callee.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.object &&
    node.callee.object.type === 'Identifier' &&
    node.callee.object.name === 'console' &&
    node.callee.property &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'log'
  );
}

function isInsideCatchClause(ancestors) {
  for (let i = ancestors.length - 2; i >= 0; i -= 1) {
    if (ancestors[i].type === 'CatchClause') {
      return true;
    }
  }
  return false;
}

const remainingInCatch = [];
const remainingOutsideCatch = [];
const parseErrors = [];

for (const filePath of collectFiles(ROOT)) {
  const source = fs.readFileSync(filePath, 'utf8');
  if (!source.includes('console.log')) continue;

  let ast;
  try {
    ast = acorn.parse(source, {
      ecmaVersion: 'latest',
      sourceType: 'script',
      allowReturnOutsideFunction: true,
      locations: true,
    });
  } catch (error) {
    try {
      ast = acorn.parse(source, {
        ecmaVersion: 'latest',
        sourceType: 'module',
        allowReturnOutsideFunction: true,
        locations: true,
      });
    } catch (moduleError) {
      parseErrors.push({
        file: path.relative(ROOT, filePath),
        reason: moduleError.message,
      });
      continue;
    }
  }

  walk.fullAncestor(ast, (node, _state, ancestors) => {
    if (!isConsoleLogCall(node)) return;

    const location = {
      file: path.relative(ROOT, filePath),
      line: node.loc.start.line,
    };

    if (isInsideCatchClause(ancestors)) {
      remainingInCatch.push(location);
    } else {
      remainingOutsideCatch.push(location);
    }
  });
}

console.log(
  JSON.stringify(
    {
      remainingOutsideCatch: remainingOutsideCatch.length,
      remainingInCatch: remainingInCatch.length,
      violations: remainingOutsideCatch,
      parseErrors,
    },
    null,
    2
  )
);

process.exit(remainingOutsideCatch.length > 0 ? 1 : 0);
