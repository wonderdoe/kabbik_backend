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
]);

const stats = {
  removed: 0,
  retainedInCatch: 0,
  modifiedFiles: [],
  skipped: [],
};

function collectFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    if (dir === ROOT && entry.name === 'scripts') continue;

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

function isInsideCatchClause(node, ancestors) {
  for (let i = ancestors.length - 2; i >= 0; i -= 1) {
    if (ancestors[i].type === 'CatchClause') {
      return true;
    }
  }
  return false;
}

function getRemovableRange(node, ancestors) {
  const parent = ancestors[ancestors.length - 2];

  if (parent && parent.type === 'ExpressionStatement') {
    return {
      start: parent.start,
      end: parent.end,
      kind: 'statement',
    };
  }

  if (
    parent &&
    parent.type === 'SequenceExpression' &&
    parent.expressions.length === 1
  ) {
    const grandParent = ancestors[ancestors.length - 3];
    if (grandParent && grandParent.type === 'ExpressionStatement') {
      return {
        start: grandParent.start,
        end: grandParent.end,
        kind: 'statement',
      };
    }
  }

  return null;
}

function cleanupSource(source, ranges) {
  let result = source;
  const sorted = [...ranges].sort((a, b) => b.start - a.start);

  for (const range of sorted) {
    let start = range.start;
    let end = range.end;

    while (start > 0 && /[ \t]/.test(result[start - 1])) {
      start -= 1;
    }

    if (result[end] === ';') {
      end += 1;
    }

    while (end < result.length && /[ \t]/.test(result[end])) {
      end += 1;
    }

    if (result[end] === '\r' && result[end + 1] === '\n') {
      end += 2;
    } else if (result[end] === '\n') {
      end += 1;
    }

    result = result.slice(0, start) + result.slice(end);
  }

  return result;
}

function processFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  if (!source.includes('console.log')) {
    return;
  }

  let ast;
  try {
    ast = acorn.parse(source, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      allowReturnOutsideFunction: true,
      locations: true,
      ranges: true,
    });
  } catch (error) {
    try {
      ast = acorn.parse(source, {
        ecmaVersion: 'latest',
        sourceType: 'script',
        allowReturnOutsideFunction: true,
        locations: true,
        ranges: true,
      });
    } catch (scriptError) {
      stats.skipped.push({
        file: path.relative(ROOT, filePath),
        reason: `Parse error: ${scriptError.message}`,
      });
      return;
    }
  }

  const removableRanges = [];
  const retainedLocations = [];

  walk.fullAncestor(ast, (node, _state, ancestors) => {
    if (!isConsoleLogCall(node)) {
      return;
    }

    if (isInsideCatchClause(node, ancestors)) {
      stats.retainedInCatch += 1;
      retainedLocations.push({
        line: node.loc.start.line,
        column: node.loc.start.column + 1,
      });
      return;
    }

    const range = getRemovableRange(node, ancestors);
    if (!range) {
      stats.skipped.push({
        file: path.relative(ROOT, filePath),
        reason: `Unsupported console.log usage at line ${node.loc.start.line}`,
      });
      return;
    }

    removableRanges.push(range);
  });

  if (removableRanges.length === 0) {
    return;
  }

  const updated = cleanupSource(source, removableRanges);
  if (updated !== source) {
    fs.writeFileSync(filePath, updated, 'utf8');
    stats.removed += removableRanges.length;
    stats.modifiedFiles.push(path.relative(ROOT, filePath));
  }
}

function main() {
  const files = collectFiles(ROOT);
  for (const file of files) {
    processFile(file);
  }

  stats.modifiedFiles.sort();

  console.log(JSON.stringify(stats, null, 2));
}

main();
