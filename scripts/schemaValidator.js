/**
 * 轻量级 JSON Schema 校验器（零依赖）
 *
 * ⚠️ 同步要求：本文件在两处共同维护，必须保持完全一致：
 *    - canvasvideo-skill/scripts/schemaValidator.js（Skill 端）
 *    - server/utils/schemaValidator.js（后端）
 *    修改一处必须同步另一处。
 *
 * 支持的 JSON Schema draft-07 子集（覆盖 project.schema.json 用到的功能）：
 * - type: string|number|boolean|object|array
 * - required, properties
 * - minLength, minimum, maximum, minItems, pattern
 * - enum
 * - oneOf
 * - dependencies（required）
 * - $ref（仅支持本文件 #/definitions/xxx 形式）
 * - 嵌套 items
 *
 * 不支持的特性（按需扩展）：anyOf, allOf, additionalProperties, if/then/else
 *
 * 使用：
 *   const { validateAgainstSchema } = require('./schemaValidator');
 *   const errors = validateAgainstSchema(data, schema);
 *   // errors: string[]，空数组表示通过
 */

function validateAgainstSchema(data, schema) {
  const errors = [];
  walk(data, schema, '', schema, errors);
  return errors;
}

function walk(value, node, pathStr, rootSchema, errors) {
  if (!node || typeof node !== 'object') return;

  // 解析 $ref
  if (node.$ref) {
    const resolved = resolveRef(node.$ref, rootSchema);
    if (resolved) {
      walk(value, resolved, pathStr, rootSchema, errors);
    }
    return;
  }

  // oneOf：必须命中且只命中一个
  if (Array.isArray(node.oneOf)) {
    let hit = 0;
    let lastErrors = [];
    for (const sub of node.oneOf) {
      const subErrors = [];
      walk(value, sub, pathStr, rootSchema, subErrors);
      if (subErrors.length === 0) {
        hit++;
      } else {
        lastErrors = subErrors;
      }
    }
    if (hit === 0) {
      errors.push(`${pathStr || '根'} 不符合 oneOf 任一分支：${lastErrors.join('; ')}`);
    } else if (hit > 1) {
      errors.push(`${pathStr || '根'} 同时符合 oneOf 多个分支（必须只命中一个）`);
    }
    return;
  }

  // type 校验
  if (node.type) {
    if (!matchType(value, node.type)) {
      errors.push(`${pathStr || '根'} 类型错误：期望 ${node.type}，实际 ${actualType(value)}`);
      return;
    }
  }

  // enum
  if (Array.isArray(node.enum)) {
    if (!node.enum.includes(value)) {
      errors.push(`${pathStr || '根'} 必须是枚举值之一 [${node.enum.map(v => JSON.stringify(v)).join(', ')}]，当前 ${JSON.stringify(value)}`);
    }
  }

  // string 约束
  if (typeof value === 'string') {
    if (typeof node.minLength === 'number' && value.length < node.minLength) {
      errors.push(`${pathStr || '根'} 字符串长度必须 ≥ ${node.minLength}（当前 ${value.length}）`);
    }
    if (typeof node.pattern === 'string') {
      try {
        if (!new RegExp(node.pattern).test(value)) {
          errors.push(`${pathStr || '根'} 不匹配 pattern: ${node.pattern}`);
        }
      } catch (e) {
        // 忽略正则错误
      }
    }
  }

  // number 约束
  if (typeof value === 'number') {
    if (typeof node.minimum === 'number' && value < node.minimum) {
      errors.push(`${pathStr || '根'} 必须 ≥ ${node.minimum}（当前 ${value}）`);
    }
    if (typeof node.maximum === 'number' && value > node.maximum) {
      errors.push(`${pathStr || '根'} 必须 ≤ ${node.maximum}（当前 ${value}）`);
    }
  }

  // object 处理
  if (matchType(value, 'object') && value !== null) {
    // required
    if (Array.isArray(node.required)) {
      for (const key of node.required) {
        if (value[key] === undefined) {
          errors.push(`${pathStr || '根'} 缺少必填字段 '${key}'`);
        }
      }
    }
    // properties
    if (node.properties) {
      for (const key of Object.keys(value)) {
        if (node.properties[key]) {
          walk(value[key], node.properties[key], joinPath(pathStr, key), rootSchema, errors);
        }
      }
    }
    // dependencies
    if (node.dependencies) {
      for (const [depKey, depSchema] of Object.entries(node.dependencies)) {
        if (value[depKey] !== undefined && depSchema && Array.isArray(depSchema.required)) {
          for (const reqKey of depSchema.required) {
            if (value[reqKey] === undefined) {
              const desc = depSchema.description ? `（${depSchema.description}）` : '';
              errors.push(`${pathStr || '根'} 因为有 '${depKey}' 字段，所以必须有 '${reqKey}' 字段${desc}`);
            }
          }
        }
      }
    }
  }

  // array 处理
  if (Array.isArray(value)) {
    if (typeof node.minItems === 'number' && value.length < node.minItems) {
      errors.push(`${pathStr || '根'} 数组长度必须 ≥ ${node.minItems}（当前 ${value.length}）`);
    }
    if (node.items) {
      value.forEach((item, idx) => {
        walk(item, node.items, joinPath(pathStr, `[${idx}]`), rootSchema, errors);
      });
    }
  }
}

function resolveRef(ref, rootSchema) {
  // 仅支持 #/path/to/node 形式
  if (!ref.startsWith('#/')) return null;
  const parts = ref.slice(2).split('/');
  let node = rootSchema;
  for (const p of parts) {
    if (!node || typeof node !== 'object') return null;
    node = node[p];
  }
  return node;
}

function matchType(value, type) {
  switch (type) {
    case 'string': return typeof value === 'string';
    case 'number': return typeof value === 'number' && !Number.isNaN(value);
    case 'integer': return Number.isInteger(value);
    case 'boolean': return typeof value === 'boolean';
    case 'object': return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'array': return Array.isArray(value);
    case 'null': return value === null;
    default: return true;
  }
}

function actualType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function joinPath(parent, key) {
  if (!parent) return String(key).startsWith('[') ? key : key;
  if (String(key).startsWith('[')) return parent + key;
  return parent + '.' + key;
}

module.exports = { validateAgainstSchema };
