import { readFileSync } from 'fs';
import { join } from 'path';
import { signInitData } from '../src/common/init-data';

// Генерирует валидно подписанную initData для локальной разработки miniapp
// вне Telegram. Вставьте выведенный snippet в консоль браузера (vite dev) —
// telegram.ts подхватит её из sessionStorage только в dev-сборке.

function readBotToken(): string {
  if (process.env.BOT_TOKEN) return process.env.BOT_TOKEN;
  try {
    const env = readFileSync(join(__dirname, '..', '.env'), 'utf8');
    const line = env
      .split('\n')
      .find((l) => l.trim().startsWith('BOT_TOKEN='));
    if (line) return line.slice(line.indexOf('=') + 1).trim();
  } catch {
    // .env отсутствует — упадём ниже с понятной ошибкой
  }
  return '';
}

const botToken = readBotToken();
if (!botToken) {
  console.error('BOT_TOKEN не найден ни в окружении, ни в .env');
  process.exit(1);
}

const telegramId = Number(process.env.DEV_TELEGRAM_ID ?? 1);
const username = process.env.DEV_USERNAME ?? 'azhar';

const initData = signInitData(
  {
    user: {
      id: telegramId,
      first_name: 'Dev',
      username,
      language_code: 'ru',
    },
  },
  botToken,
);

console.log('initData подписана для', { telegramId, username });
console.log('\nВставьте в консоль браузера на странице vite dev:\n');
console.log(`sessionStorage.setItem('dev-init-data', ${JSON.stringify(initData)});`);
console.log('\n…и перезагрузите страницу.');
