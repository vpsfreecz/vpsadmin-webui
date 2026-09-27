#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const LANGUAGES = ['en', 'cs'];
const PLURAL_CATEGORIES = ['zero', 'one', 'two', 'few', 'many', 'other'];
const PLURAL_SUFFIX = /^(.*)\.(zero|one|two|few|many|other)$/;
const PLACEHOLDER = /\{([a-zA-Z0-9_]+)\}/g;

function walkFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkFiles(file);
    return entry.isFile() && file.endsWith('.ts') ? [file] : [];
  }).sort();
}

function unwrap(expression) {
  while (ts.isAsExpression(expression) || ts.isSatisfiesExpression(expression) ||
         ts.isParenthesizedExpression(expression)) {
    expression = expression.expression;
  }
  return expression;
}

function location(source, node, root) {
  const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
  return `${path.relative(root, source.fileName)}:${line + 1}`;
}

function parseLanguage(root, lang, issues) {
  const entries = new Map();
  const directory = path.join(root, 'src/i18n/locales', lang);
  const aggregator = path.join(root, 'src/i18n', `${lang}.ts`);
  const exportedObjects = new Map();
  const spreads = [];
  const files = fs.existsSync(aggregator) ? [aggregator, ...walkFiles(directory)] : walkFiles(directory);
  for (const file of files) {
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const imports = new Map();
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const moduleFile = path.resolve(path.dirname(file), `${statement.moduleSpecifier.text}.ts`);
      const bindings = statement.importClause?.namedBindings;
      if (!ts.isNamedImports(bindings)) continue;
      for (const element of bindings.elements) {
        imports.set(element.name.text, { file: moduleFile, name: (element.propertyName ?? element.name).text });
      }
    }
    for (const diagnostic of source.parseDiagnostics) {
      const line = source.getLineAndCharacterOfPosition(diagnostic.start ?? 0).line + 1;
      issues.push(`${path.relative(root, file)}:${line}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`);
    }

    let exports = 0;
    for (const statement of source.statements) {
      if (!ts.isVariableStatement(statement) ||
          !statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) continue;
      for (const declaration of statement.declarationList.declarations) {
        exports += 1;
        const at = location(source, declaration, root);
        const value = declaration.initializer && unwrap(declaration.initializer);
        if (!ts.isIdentifier(declaration.name) || !value || !ts.isObjectLiteralExpression(value)) {
          issues.push(`${at}: unsupported catalog declaration; expected an exported literal object`);
          continue;
        }
        const names = exportedObjects.get(file) ?? new Set();
        names.add(declaration.name.text);
        exportedObjects.set(file, names);
        for (const property of value.properties) {
          const propAt = location(source, property, root);
          if (ts.isSpreadAssignment(property)) {
            if (!ts.isIdentifier(property.expression)) {
              issues.push(`${propAt}: unsupported catalog spread; expected an imported object name`);
            } else {
              spreads.push({ name: property.expression.text, file, imports, at: propAt });
            }
            continue;
          }
          if (!ts.isPropertyAssignment(property) || !ts.isStringLiteral(property.name) ||
              !(ts.isStringLiteral(property.initializer) || ts.isNoSubstitutionTemplateLiteral(property.initializer))) {
            issues.push(`${propAt}: unsupported catalog entry; expected a quoted key and literal string value`);
            continue;
          }
          const key = property.name.text;
          const previous = entries.get(key);
          if (previous) {
            issues.push(`${propAt}: duplicate ${lang} key ${JSON.stringify(key)} (first at ${previous.at})`);
          } else {
            entries.set(key, { value: property.initializer.text, at: propAt });
          }
        }
      }
    }
    if (exports === 0) issues.push(`${path.relative(root, file)}: no exported catalog declaration`);
  }
  for (const spread of spreads) {
    const imported = spread.imports.get(spread.name);
    const source = imported ?? { file: spread.file, name: spread.name };
    if (!(source.file === aggregator || source.file.startsWith(`${directory}${path.sep}`)) ||
        !exportedObjects.get(source.file)?.has(source.name)) {
      issues.push(`${spread.at}: unsupported catalog spread ${JSON.stringify(spread.name)}; source must be a literal export in this locale tree`);
    }
  }
  return entries;
}

function placeholders(value) {
  return [...new Set([...value.matchAll(PLACEHOLDER)].map((match) => match[1]))].sort();
}

function pluralGroups(entries) {
  const groups = new Map();
  for (const key of entries.keys()) {
    const match = key.match(PLURAL_SUFFIX);
    if (!match) continue;
    const [, base, category] = match;
    const categories = groups.get(base) ?? new Set();
    categories.add(category);
    groups.set(base, categories);
  }
  // An isolated `.other` is often an ordinary label, not a plural form.
  return new Map([...groups].filter(([, categories]) => [...categories].some((category) => category !== 'other')));
}

export function validateCatalogs(root) {
  const issues = [];
  const [en, cs] = LANGUAGES.map((lang) => parseLanguage(root, lang, issues));
  const missingInCs = [...en.keys()].filter((key) => !cs.has(key)).sort();
  const missingInEn = [...cs.keys()].filter((key) => !en.has(key)).sort();

  for (const key of missingInCs) issues.push(`${en.get(key).at}: missing cs key ${JSON.stringify(key)}`);
  for (const key of missingInEn) issues.push(`${cs.get(key).at}: missing en key ${JSON.stringify(key)}`);
  for (const [key, english] of en) {
    const czech = cs.get(key);
    if (!czech) continue;
    const enPlaceholders = placeholders(english.value);
    const csPlaceholders = placeholders(czech.value);
    if (enPlaceholders.join() !== csPlaceholders.join()) {
      issues.push(`${english.at} / ${czech.at}: placeholder mismatch ${JSON.stringify(key)}: ` +
        `en=${enPlaceholders.join(',')} cs=${csPlaceholders.join(',')}`);
    }
  }

  const enGroups = pluralGroups(en);
  const csGroups = pluralGroups(cs);
  for (const base of new Set([...enGroups.keys(), ...csGroups.keys()])) {
    const enCategories = enGroups.get(base) ?? new Set();
    const csCategories = csGroups.get(base) ?? new Set();
    const enList = PLURAL_CATEGORIES.filter((category) => enCategories.has(category));
    const csList = PLURAL_CATEGORIES.filter((category) => csCategories.has(category));
    if (enList.join() !== csList.join() || !enCategories.has('other') || !csCategories.has('other')) {
      issues.push(`plural category mismatch ${JSON.stringify(base)}: ` +
        `en=${enList.join(',') || '(none)'} cs=${csList.join(',') || '(none)'}; both need .other`);
    }
  }

  return { enCount: en.size, csCount: cs.size, missingInCs, missingInEn, issues: issues.sort() };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = new Set(process.argv.slice(2));
  if (args.has('--help') || args.has('-h')) {
    console.log(`Usage: node scripts/audit-i18n.mjs [--fail] [--json]

Checks literal en/cs catalogs for duplicate keys, key/placeholder/plural parity,
and unsupported declarations. --fail is retained for existing callers; all
validation errors fail.`);
  } else {
    const report = validateCatalogs(process.cwd());
    if (args.has('--json')) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`i18n audit: en=${report.enCount}, cs=${report.csCount}`);
      for (const issue of report.issues) console.error(`- ${issue}`);
      if (report.issues.length === 0) console.log('OK: literal catalogs and translations match.');
    }
    if (report.issues.length > 0) process.exitCode = 1;
  }
}
