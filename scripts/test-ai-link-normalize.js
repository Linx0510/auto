require('dotenv').config();

const { normalizeReplyLinks } = require('../services/aiService');

const cases = [
  {
    name: 'bare contact url',
    input:
      'Диагностика 3 000 ₽. Запись на странице: http://127.0.0.1:3001/#contact',
    mustInclude: ['3 000', 'на странице', '[записаться](/#contact)'],
    mustNotInclude: ['http://127.0.0.1']
  },
  {
    name: 'url with trailing period',
    input: 'Подробнее: http://127.0.0.1:3001/#contact.',
    mustInclude: ['[записаться](/#contact)', '.'],
    mustNotInclude: ['/#contact.']
  },
  {
    name: 'existing markdown link preserved',
    input: 'Уже есть [тут](http://127.0.0.1:3001/#contact) и цена 2 500 ₽',
    mustInclude: ['[тут]', '2 500', '₽'],
    mustNotInclude: ['[записаться]([тут]']
  },
  {
    name: 'mixed markdown and bare url',
    input:
      'Смотрите [услуги](http://127.0.0.1:3001/#services) или http://127.0.0.1:3001/login',
    mustInclude: ['[услуги]', '[войти](/login)'],
    mustNotInclude: ['http://127.0.0.1']
  },
  {
    name: 'plain text untouched',
    input: 'Возможно, проблема в тормозах. Точную причину определит мастер.',
    mustInclude: ['Возможно', 'тормозах', 'мастер'],
    mustNotInclude: ['[тут]']
  },
  {
    name: 'incomplete contacts link',
    input:
      'Пожалуйста, повторите описание проблемы. Оформить заявку можно [контакты]',
    mustInclude: ['описание проблемы', '[контакты](/#contact)'],
    mustNotInclude: ['http://'],
    mustNotMatch: [/\[контакты\](?!\()/]
  },
  {
    name: 'incomplete тут link',
    input: 'Записаться можно [тут]',
    mustInclude: ['[тут](/#contact)'],
    mustNotMatch: [/\[тут\](?!\()/]
  },
  {
    name: 'complete relative link preserved',
    input: 'Смотрите [услуги](/#services) и цены.',
    mustInclude: ['[услуги](/#services)', 'цены'],
    mustNotInclude: ['http://']
  },
  {
    name: 'unknown bracket label stripped',
    input: 'Текст [неизвестная метка] без ссылки.',
    mustInclude: ['неизвестная метка', 'без ссылки'],
    mustNotInclude: ['[неизвестная метка]']
  },
  {
    name: 'price and duration',
    input: 'Стоимость 1 500 ₽, длительность 30 мин.',
    mustInclude: ['1 500 ₽', '30 мин'],
    mustNotInclude: ['[тут]']
  }
];

let failed = 0;

for (const testCase of cases) {
  const output = normalizeReplyLinks(testCase.input);
  const errors = [];

  for (const part of testCase.mustInclude) {
    if (!output.includes(part)) {
      errors.push(`missing: ${part}`);
    }
  }

  for (const part of testCase.mustNotInclude || []) {
    if (output.includes(part)) {
      errors.push(`unexpected: ${part}`);
    }
  }

  if (Array.isArray(testCase.mustNotMatch)) {
    for (const pattern of testCase.mustNotMatch) {
      if (pattern.test(output)) {
        errors.push(`unexpected pattern: ${pattern}`);
      }
    }
  }

  if (errors.length) {
    failed += 1;
    console.error(`FAIL: ${testCase.name}`);
    console.error('  input: ', testCase.input);
    console.error('  output:', output);
    console.error('  errors:', errors.join('; '));
  } else {
    console.log(`OK: ${testCase.name}`);
  }
}

if (failed > 0) {
  process.exit(1);
}

console.log(`All ${cases.length} tests passed.`);
