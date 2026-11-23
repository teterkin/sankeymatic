import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { FLOW_RE, parseSetting } from './validate.mjs';

const MANAGED = new Set([
  'size_w',
  'size_h',
  'labelvalue_position',
  'labelposition_scheme',
  'labels_relativesize',
  'layout_order',
]);

const DEFAULTS = {
  labelSize: 18,
  nodeW: 9,
  marginL: 12,
  marginR: 12,
  marginT: 18,
  marginB: 20,
  minWidth: 600,
  maxWidth: 1600,
  nodeHF: 0.5,
  spacing: 0.85,
  baseHeight: 600,
  maxHeight: 1200,
  charEm: 0.5,
  lineHeight: 1.3,
  gapPadding: 10,
};

export function parseFlows(text) {
  const flows = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('//') || line.startsWith("'")) {
      continue;
    }
    const match = line.match(FLOW_RE);
    if (match) {
      flows.push({
        source: match[1],
        amount: match[2],
        target: match[3],
        color: match[4],
        opacity: match[5],
      });
    }
  }
  return flows;
}

export function wrapLabel(name, limit) {
  return String(name)
    .split('\\n')
    .map((segment) => {
      const words = segment.split(/\s+/).filter(Boolean);
      const lines = [];
      let line = '';
      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (line && candidate.length > limit) {
          lines.push(line);
          line = word;
        } else {
          line = candidate;
        }
      }
      if (line) {
        lines.push(line);
      }
      return lines.join('\\n');
    })
    .join('\\n');
}

function computeStages(flows) {
  const names = new Set();
  const adjacency = new Map();
  const indegree = new Map();

  for (const flow of flows) {
    names.add(flow.source);
    names.add(flow.target);
    if (!adjacency.has(flow.source)) {
      adjacency.set(flow.source, []);
    }
    adjacency.get(flow.source).push(flow.target);
  }
  for (const name of names) {
    indegree.set(name, 0);
  }
  for (const flow of flows) {
    indegree.set(flow.target, indegree.get(flow.target) + 1);
  }

  const stage = new Map([...names].map((name) => [name, 0]));
  const queue = [...names].filter((name) => indegree.get(name) === 0);
  const order = [];

  while (queue.length) {
    const name = queue.shift();
    order.push(name);
    for (const target of adjacency.get(name) ?? []) {
      stage.set(target, Math.max(stage.get(target), stage.get(name) + 1));
      indegree.set(target, indegree.get(target) - 1);
      if (indegree.get(target) === 0) {
        queue.push(target);
      }
    }
  }

  if (order.length !== names.size) {
    throw new Error('в потоках есть цикл');
  }

  return {
    stage,
    names,
    stages: names.size ? Math.max(...stage.values()) + 1 : 0,
  };
}

export function planLayout(flows, options = {}) {
  const cfg = { ...DEFAULTS, ...options };
  const { stage, names, stages } = computeStages(flows);
  const limit = Math.max(
    10,
    Math.round(200 / (cfg.labelSize * cfg.charEm))
  );

  if (stages === 0) {
    return { stages: 0, width: cfg.minWidth, height: cfg.baseHeight, limit, names: new Map() };
  }

  const wrapped = new Map([...names].map((name) => [name, wrapLabel(name, limit)]));
  const longest = Math.max(
    1,
    ...[...wrapped.values()].map((label) =>
      Math.max(...label.split('\\n').map((part) => part.length))
    )
  );
  const labelPx = longest * cfg.labelSize * cfg.charEm;

  const graphWidth = stages * cfg.nodeW
    + (stages - 1) * (labelPx + cfg.gapPadding);
  const rawWidth = cfg.marginL + cfg.marginR + graphWidth;
  const width = Math.min(
    cfg.maxWidth,
    Math.max(cfg.minWidth, Math.ceil(rawWidth / 50) * 50)
  );

  const nodesPerStage = new Array(stages).fill(0);
  const linesPerStage = new Array(stages).fill(1);
  for (const [name, stageIndex] of stage) {
    nodesPerStage[stageIndex] += 1;
    linesPerStage[stageIndex] = Math.max(
      linesPerStage[stageIndex],
      wrapped.get(name).split('\\n').length
    );
  }
  const greatest = Math.max(...nodesPerStage);
  const maxLines = Math.max(...linesPerStage.map((lines) => lines + 1));
  const labelHeight = maxLines * cfg.labelSize * cfg.lineHeight + 12;
  const spacingFactor = (1 - cfg.nodeHF) * cfg.spacing;
  const rawHeight = spacingFactor > 0.01 && greatest > 1
    ? cfg.marginT + cfg.marginB + greatest
      + ((greatest - 1) * labelHeight) / spacingFactor
    : cfg.marginT + cfg.marginB + greatest * (labelHeight + 24);
  const height = Math.min(
    cfg.maxHeight,
    Math.max(cfg.baseHeight, Math.ceil(rawHeight / 50) * 50)
  );

  return { stages, width, height, limit, names: wrapped, stageOf: stage };
}

function settingsOf(text) {
  const settings = new Map();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('//') || line.startsWith("'") || line.startsWith(':')) {
      continue;
    }
    const setting = parseSetting(line);
    if (setting?.key) {
      settings.set(setting.key, setting.value);
    }
  }
  return settings;
}

function numericSetting(settings, key, fallback) {
  const raw = settings.get(key);
  const value = raw === undefined ? Number.NaN : Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function managedLines(plan) {
  return [
    'labelvalue position below',
    'labelposition scheme auto',
    'layout order exact',
    'labels relativesize 100',
    `size w ${plan.width}`,
    `size h ${plan.height}`,
  ];
}

export function layoutSource(text, overrides = {}) {
  const flows = parseFlows(text);
  const settings = settingsOf(text);
  const plan = planLayout(flows, {
    labelSize: overrides.labelSize
      ?? numericSetting(settings, 'labelname_size', DEFAULTS.labelSize),
    nodeW: numericSetting(settings, 'node_w', DEFAULTS.nodeW),
    marginL: numericSetting(settings, 'margin_l', DEFAULTS.marginL),
    marginR: numericSetting(settings, 'margin_r', DEFAULTS.marginR),
    marginT: numericSetting(settings, 'margin_t', DEFAULTS.marginT),
    marginB: numericSetting(settings, 'margin_b', DEFAULTS.marginB),
    nodeHF: numericSetting(settings, 'node_h', 50) / 100,
    spacing: numericSetting(settings, 'node_spacing', 85) / 100,
  });

  const lastStage = plan.stages - 1;
  const lastValue = new Map();
  if (lastStage >= 0) {
    for (const flow of flows) {
      if (plan.stageOf.get(flow.target) !== lastStage) {
        continue;
      }
      if (flow.amount === '*' || flow.amount === '?') {
        continue;
      }
      lastValue.set(flow.target, (lastValue.get(flow.target) ?? 0) + Number(flow.amount));
    }
  }
  const deferred = [];

  const lines = text.split(/\r?\n/);
  let insertAt = lines.findIndex((line) => line.trim() === '// === Settings ===');
  if (insertAt === -1) {
    insertAt = lines.reduce(
      (acc, line, index) => (parseSetting(line.trim())?.key ? index : acc),
      -1
    );
  }

  const output = [];
  let inserted = false;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const setting = trimmed
      && !trimmed.startsWith('//')
      && !trimmed.startsWith("'")
      && !trimmed.startsWith(':')
      ? parseSetting(trimmed)
      : null;

    if (setting?.key && MANAGED.has(setting.key)) {
      return;
    }

    const flow = trimmed.match(FLOW_RE);
    if (flow) {
      const [, source, amount, target, color, opacity] = flow;
      const suffix = color ? ` #${color}${opacity ? `.${opacity}` : ''}` : '';
      const flowLine = `${plan.names.get(source) ?? source} [${amount}] `
        + `${plan.names.get(target) ?? target}${suffix}`;
      if (plan.stageOf.get(target) === lastStage) {
        deferred.push({ text: flowLine, value: lastValue.get(target) ?? 0 });
      } else {
        output.push(flowLine);
      }
    } else if (trimmed.startsWith(':')) {
      const declaration = trimmed.match(/^:(.+?)\s+(#[0-9a-f]{3,6}(?:\.\d{1,4})?.*)$/i);
      if (declaration) {
        output.push(
          `:${plan.names.get(declaration[1]) ?? declaration[1]} ${declaration[2]}`
        );
      } else {
        output.push(line);
      }
    } else {
      output.push(line);
    }

    if (!inserted && index === insertAt) {
      output.push(...managedLines(plan));
      inserted = true;
    }
  });

  if (!inserted) {
    output.unshift(...managedLines(plan));
  }

  while (output.length && output[output.length - 1] === '') {
    output.pop();
  }
  deferred.sort((a, b) => b.value - a.value);
  output.push(...deferred.map((item) => item.text));

  return `${output.join('\n').replace(/\n+$/, '')}\n`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const file = args.find((arg) => !arg.startsWith('--'));
  const inPlace = args.includes('--in-place');
  const sizeIndex = args.indexOf('--label-size');
  const labelSize = sizeIndex === -1 ? undefined : Number(args[sizeIndex + 1]);

  if (!file) {
    console.error('использование: node layout.mjs <файл> [--in-place] [--label-size N]');
    process.exit(2);
  }
  if (labelSize !== undefined && !(Number.isFinite(labelSize) && labelSize > 0)) {
    console.error('использование: node layout.mjs <файл> [--in-place] [--label-size N]');
    process.exit(2);
  }

  try {
    const result = layoutSource(readFileSync(file, 'utf8'), { labelSize });
    if (inPlace) {
      writeFileSync(file, result);
      console.log(`ок: ${file}`);
    } else {
      process.stdout.write(result);
    }
  } catch (error) {
    console.error(`ошибка: ${error.message}`);
    process.exit(1);
  }
}
