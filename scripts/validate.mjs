import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const FLOW_RE =
  /^(.+?)\s+\[(\d+(?:\.\d+)?|\*|\?)\]\s+(.+?)(?:\s+#([0-9a-f]{3,6})(?:\.(\d{1,4}))?)?$/i;

const NODE_RE = /^:(.+?)\s+#([0-9a-f]{3,6})(?:\.(\d{1,4}))?\s*(?:<<|>>)?\s*(?:<<|>>)?$/i;

const SETTINGS = new Map([
  ['size_w', ['whole', 40]],
  ['size_h', ['whole', 40]],
  ['margin_l', ['whole', 0]],
  ['margin_r', ['whole', 0]],
  ['margin_t', ['whole', 0]],
  ['margin_b', ['whole', 0]],
  ['bg_color', ['color']],
  ['bg_transparent', ['yn']],
  ['node_w', ['whole', 0]],
  ['node_h', ['half', 0, 100]],
  ['node_spacing', ['half', 0, 100]],
  ['node_border', ['whole', 0]],
  ['node_theme', ['radio', ['a', 'b', 'c', 'd', 'none']]],
  ['node_color', ['color']],
  ['node_opacity', ['decimal']],
  ['flow_curvature', ['decimal']],
  ['flow_inheritfrom', ['radio', ['source', 'target', 'outside-in', 'none']]],
  ['flow_color', ['color']],
  ['flow_opacity', ['decimal']],
  ['layout_order', ['radio', ['automatic', 'exact']]],
  ['layout_justifyorigins', ['yn']],
  ['layout_justifyends', ['yn']],
  ['layout_reversegraph', ['yn']],
  ['layout_attachincompletesto', ['radio', ['leading', 'nearest', 'trailing']]],
  ['labels_color', ['color']],
  ['labels_hide', ['yn']],
  ['labels_highlight', ['decimal']],
  ['labels_fontface', ['radio', ['monospace', 'sans-serif', 'serif']]],
  ['labels_linespacing', ['decimal']],
  ['labels_relativesize', ['whole', 50, 150]],
  ['labels_magnify', ['whole', 50, 150]],
  ['labelname_appears', ['yn']],
  ['labelname_size', ['half', 6]],
  ['labelname_weight', ['whole', 100, 700]],
  ['labelvalue_appears', ['yn']],
  ['labelvalue_fullprecision', ['yn']],
  ['labelvalue_position', ['radio', ['above', 'before', 'after', 'below']]],
  ['labelvalue_weight', ['whole', 100, 700]],
  ['labelposition_autoalign', ['integer', -1, 1]],
  ['labelposition_scheme', ['radio', ['auto', 'per_stage']]],
  ['labelposition_first', ['radio', ['before', 'after']]],
  ['labelposition_breakpoint', ['whole', 2, 9999]],
  ['value_format', ['list', [',.', '.,', ' .', ' ,', 'X.', 'X,']]],
  ['value_prefix', ['text', 0, 99]],
  ['value_suffix', ['text', 0, 99]],
  ['themeoffset_a', ['whole', 0, 9]],
  ['themeoffset_b', ['whole', 0, 9]],
  ['themeoffset_c', ['whole', 0, 7]],
  ['themeoffset_d', ['whole', 0, 11]],
  ['meta_mentionsankeymatic', ['yn']],
  ['meta_listimbalances', ['yn']],
  ['internal_iterations', ['whole', 0, 50]],
  ['internal_revealshadows', ['yn']],
]);

function isComment(line) {
  return line.startsWith('//') || line.startsWith("'");
}

function inRange(value, min, max) {
  return (min === undefined || value >= min) && (max === undefined || value <= max);
}

function settingIsValid([type, min, max], raw) {
  switch (type) {
    case 'whole': {
      if (!/^\d+$/.test(raw)) {
        return false;
      }
      return inRange(Number(raw), min, max);
    }
    case 'half': {
      if (!/^\d+(?:\.5)?$/.test(raw)) {
        return false;
      }
      return inRange(Number(raw), min, max);
    }
    case 'integer': {
      if (!/^-?\d+$/.test(raw)) {
        return false;
      }
      return inRange(Number(raw), min, max);
    }
    case 'decimal': {
      if (!/^\d(?:\.\d+)?$/.test(raw)) {
        return false;
      }
      return inRange(Number(raw), 0, 1);
    }
    case 'color':
      return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw);
    case 'yn':
      return /^(?:y|yes|n|no)$/i.test(raw);
    case 'radio':
    case 'list':
      return min.includes(raw);
    case 'text': {
      if (!/^'(.*)'$/.test(raw)) {
        return false;
      }
      const length = raw.slice(1, -1).replaceAll("''", "'").length;
      return inRange(length, min, max);
    }
    default:
      return false;
  }
}

export function parseSetting(line) {
  const two = line.match(/^(\S+)\s+(\S+)\s+(.+)$/);
  if (two) {
    const key = `${two[1]}_${two[2]}`;
    if (SETTINGS.has(key)) {
      return { key, value: two[3] };
    }
  }

  const one = line.match(/^(\S+)\s+(.+)$/);
  if (!one) {
    return null;
  }
  if (SETTINGS.has(one[1])) {
    return { key: one[1], value: one[2] };
  }
  return { key: null, name: two ? `${two[1]} ${two[2]}` : one[1] };
}

export function validate(text) {
  const errors = [];
  const warnings = [];
  const flows = [];
  const order = [];
  const seen = new Set();
  const nodesByName = {};

  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line || isComment(line)) {
      return;
    }

    const match = line.match(FLOW_RE);
    if (match) {
      const [, source, amount, target] = match;
      if (amount !== '*' && amount !== '?' && Number(amount) <= 0) {
        errors.push({ line: index + 1, message: 'сумма должна быть больше нуля' });
        return;
      }
      for (const name of [source, target]) {
        if (!seen.has(name)) {
          seen.add(name);
          order.push(name);
        }
        nodesByName[name] ??= { in: 0, out: 0, line: index + 1, unchecked: false };
        nodesByName[name].line = index + 1;
      }
      if (amount === '*' || amount === '?') {
        nodesByName[source].unchecked = true;
        nodesByName[target].unchecked = true;
      } else {
        nodesByName[source].out += Number(amount);
        nodesByName[target].in += Number(amount);
      }
      flows.push({ line: index + 1, source, amount, target });
      return;
    }

    if (line.startsWith(':')) {
      if (!NODE_RE.test(line)) {
        errors.push({ line: index + 1, message: 'некорректное объявление узла' });
      }
      return;
    }

    const setting = parseSetting(line);
    if (!setting) {
      if (line.includes('[') || line.includes(']')) {
        errors.push({ line: index + 1, message: 'некорректная строка потока' });
      }
      return;
    }

    if (setting.key === null) {
      const looksLikeFlow = line.includes('[') || line.includes(']');
      errors.push({
        line: index + 1,
        message: looksLikeFlow
          ? 'некорректная строка потока'
          : `неизвестная настройка "${setting.name}"`,
      });
      return;
    }

    if (!settingIsValid(SETTINGS.get(setting.key), setting.value)) {
      errors.push({
        line: index + 1,
        message: `недопустимое значение для ${setting.key}: "${setting.value}"`,
      });
    }
  });

  const adjacency = new Map();
  for (const flow of flows) {
    if (!adjacency.has(flow.source)) {
      adjacency.set(flow.source, []);
    }
    adjacency.get(flow.source).push(flow);
  }

  const state = new Map();
  const path = [];
  for (const flow of flows) {
    if (state.has(flow.source)) {
      continue;
    }
    state.set(flow.source, 1);
    path.push(flow.source);
    const stack = [{ name: flow.source, edges: adjacency.get(flow.source) ?? [], next: 0 }];
    while (stack.length) {
      const frame = stack[stack.length - 1];
      if (frame.next >= frame.edges.length) {
        state.set(frame.name, 2);
        path.pop();
        stack.pop();
        continue;
      }
      const edge = frame.edges[frame.next];
      frame.next += 1;
      if (edge.target === frame.name) {
        errors.push({
          line: edge.line,
          message: `цикл: "${frame.name}" -> "${frame.name}"`,
        });
      } else if (state.get(edge.target) === 1) {
        const start = path.indexOf(edge.target);
        const cycle = [...path.slice(start), edge.target]
          .map((node) => `"${node}"`)
          .join(' -> ');
        errors.push({ line: edge.line, message: `цикл: ${cycle}` });
      } else if (!state.has(edge.target)) {
        state.set(edge.target, 1);
        path.push(edge.target);
        stack.push({
          name: edge.target,
          edges: adjacency.get(edge.target) ?? [],
          next: 0,
        });
      }
    }
  }

  let imbalances = 0;
  for (const [name, sums] of Object.entries(nodesByName)) {
    if (sums.unchecked || sums.in === 0 || sums.out === 0) {
      continue;
    }
    const difference = Number((sums.in - sums.out).toFixed(6));
    if (difference !== 0) {
      imbalances += 1;
      warnings.push({
        line: sums.line,
        message: `узел "${name}": вход ${sums.in}, выход ${sums.out} (разница ${difference})`,
      });
    }
  }

  return {
    errors,
    warnings,
    stats: {
      nodes: order.length,
      flows: flows.length,
      imbalances,
      nodesByName,
    },
  };
}

export function plural(count, one, few, many) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) {
    return many;
  }
  if (mod10 === 1) {
    return one;
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return few;
  }
  return many;
}

export function summarize(report, file) {
  const { nodes, flows, imbalances } = report.stats;
  return `${file}: ${nodes} ${plural(nodes, 'узел', 'узла', 'узлов')}, `
    + `${flows} ${plural(flows, 'поток', 'потока', 'потоков')}, `
    + `${imbalances} ${plural(imbalances, 'дисбаланс', 'дисбаланса', 'дисбалансов')}`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const file = args.find((arg) => !arg.startsWith('--'));
  if (!file) {
    console.error('использование: node validate.mjs <файл> [--strict] [--json]');
    process.exit(2);
  }
  const report = validate(readFileSync(file, 'utf8'));
  if (args.includes('--json')) {
    console.log(JSON.stringify({ file, ...report }, null, 2));
  } else {
    console.log(summarize(report, file));
    for (const error of report.errors) {
      console.log(`ОШИБКА строка ${error.line}: ${error.message}`);
    }
    for (const warning of report.warnings) {
      console.log(`ПРЕДУПРЕЖДЕНИЕ строка ${warning.line}: ${warning.message}`);
    }
  }
  const failed = report.errors.length > 0
    || (args.includes('--strict') && report.warnings.length > 0);
  process.exit(failed ? 1 : 0);
}
