import { Locale } from 'src/common/i18n';

export function userEntityLabel(locale?: Locale): string {
  switch (locale) {
    case 'RU':
      return 'Пользователь';
    case 'KK':
      return 'Пайдаланушы';
    default:
      return 'User';
  }
}
