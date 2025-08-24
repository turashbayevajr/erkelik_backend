// src/common/messages.ts
import type { Locale as CommonLocale, MessageKey } from './i18n';
import { normalizeLocale } from './i18n';
import type { Locale as PrismaLocale } from '@prisma/client';

type LocaleLike = CommonLocale | PrismaLocale | undefined;
type TemplateFn = (entity: string) => string;

const dict: Record<CommonLocale, Record<MessageKey, TemplateFn>> = {
  EN: {
    CREATED_OK:     (e) => `${e} has been created successfully.`,
    UPDATED_OK:     (e) => `${e} has been updated successfully.`,
    DELETED_OK:     (e) => `${e} has been deleted successfully.`,
    NOT_FOUND:      (e) => `${e} not found.`,
    ALREADY_EXISTS: (e) => `${e} with this identifier already exists.`,
    UNEXPECTED:     ()  => `Unexpected error. Please try again later.`,
    VALIDATION_FAILED: () => `Validation failed. Check input fields.`,
  },
  RU: {
    CREATED_OK:     (e) => `${e} успешно создан.`,
    UPDATED_OK:     (e) => `${e} успешно обновлён.`,
    DELETED_OK:     (e) => `${e} успешно удалён.`,
    NOT_FOUND:      (e) => `${e} не найден.`,
    ALREADY_EXISTS: (e) => `${e} с таким идентификатором уже существует.`,
    UNEXPECTED:     ()  => `Непредвиденная ошибка. Повторите попытку позже.`,
    VALIDATION_FAILED: () => `Ошибка валидации. Проверьте входные данные.`,
  },
  KK: {
    CREATED_OK:     (e) => `${e} сәтті құрылды.`,
    UPDATED_OK:     (e) => `${e} сәтті жаңартылды.`,
    DELETED_OK:     (e) => `${e} сәтті жойылды.`,
    NOT_FOUND:      (e) => `${e} табылмады.`,
    ALREADY_EXISTS: (e) => `Мұндай идентификаторы бар ${e} бұрыннан бар.`,
    UNEXPECTED:     ()  => `Күтпеген қате. Кейінірек қайталап көріңіз.`,
    VALIDATION_FAILED: () => `Тексеру қатесі. Енгізілген деректерді тексеріңіз.`,
  },
};

export function t(key: MessageKey, locale: LocaleLike, entityLabel: string): string {
  const lang = normalizeLocale(locale);
  return dict[lang][key](entityLabel);
}
