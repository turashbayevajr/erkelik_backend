// src/common/messages.ts
import type { Locale as CommonLocale, MessageKey } from './i18n';
import { normalizeLocale } from './i18n';
import type { Locale as PrismaLocale } from '@prisma/client';

type LocaleLike = CommonLocale | PrismaLocale | undefined;
type TemplateFn = (entity: string) => string;

const dict: Record<CommonLocale, Record<MessageKey, TemplateFn>> = {
  EN: {
    CREATED_OK: (e) => `${e} has been created successfully.`,
    UPDATED_OK: (e) => `${e} has been updated successfully.`,
    DELETED_OK: (e) => `${e} has been deleted successfully.`,
    NOT_FOUND: (e) => `${e} not found.`,
    ALREADY_EXISTS: (e) => `${e} with this identifier already exists.`,
    UNEXPECTED: () => `Unexpected error. Please try again later.`,
    VALIDATION_FAILED: () => `Validation failed. Check input fields.`,
    PHOTO_OR_LINK_REQUIRED: () =>
      `Add a photo or a link — a wish needs at least one of them.`,
    IMAGE_INVALID: () =>
      `Could not read the photo. Send a JPEG, PNG or WebP image up to 10 MB.`,
    TOO_MANY_IMAGES: () => `Too many photos — up to 8 per wish.`,
    PRICE_TOO_LARGE: () =>
      `The price is too large — enter up to 9 999 999 999.`,
    FORBIDDEN: () => `You don't have permission to perform this action.`,
    STATUS_CONFLICT: (e) =>
      `Invalid ${e} status transition or it has already been processed.`,
    RESERVED_OK: (e) => `${e} has been reserved successfully.`,
    UNRESERVED_OK: (e) => `${e} reservation has been released.`,
    ORDERED_OK: (e) => `${e} has been marked as ordered.`,
    FULFILLED_OK: (e) => `${e} has been marked as fulfilled.`,
    SELF_RESERVED_OK: (e) => `You marked your own ${e} as reserved.`,
    SUBSCRIBED_OK: () => `You are now subscribed to this wishlist.`,
    UNSUBSCRIBED_OK: () => `You have unsubscribed from this wishlist.`,
    FRIEND_REQUESTED: () => `Friend request sent.`,
    FRIEND_ACCEPTED: () => `Friend request accepted — you are now friends.`,
    FRIEND_REMOVED: () => `Removed from friends.`,
  },
  RU: {
    CREATED_OK: (e) => `${e} успешно создан.`,
    UPDATED_OK: (e) => `${e} успешно обновлён.`,
    DELETED_OK: (e) => `${e} успешно удалён.`,
    NOT_FOUND: (e) => `${e} не найден.`,
    ALREADY_EXISTS: (e) => `${e} с таким идентификатором уже существует.`,
    UNEXPECTED: () => `Непредвиденная ошибка. Повторите попытку позже.`,
    VALIDATION_FAILED: () => `Ошибка валидации. Проверьте входные данные.`,
    PHOTO_OR_LINK_REQUIRED: () =>
      `Добавьте фото или ссылку — у желания должно быть хотя бы одно из двух.`,
    IMAGE_INVALID: () =>
      `Не удалось прочитать фото. Пришлите JPEG, PNG или WebP до 10 МБ.`,
    TOO_MANY_IMAGES: () => `Слишком много фото — не больше 8 на желание.`,
    PRICE_TOO_LARGE: () =>
      `Слишком большая цена — введите не больше 9 999 999 999.`,
    SELF_RESERVED_OK: (e) => `Вы отметили своё ${e} как зарезервированное.`,
    FORBIDDEN: () => `Недостаточно прав для выполнения этого действия.`,
    STATUS_CONFLICT: (e) =>
      `Неверный переход статуса для ${e} или он уже обработан.`,
    RESERVED_OK: (e) => `${e} успешно зарезервирован(о).`,
    UNRESERVED_OK: (e) => `Резерв для ${e} снят.`,
    ORDERED_OK: (e) => `${e} помечен(о) как заказан(о).`,
    FULFILLED_OK: (e) => `${e} помечен(о) как выполнен(о).`,
    SUBSCRIBED_OK: () => `Вы подписались на этот вишлист.`,
    UNSUBSCRIBED_OK: () => `Вы отписались от этого вишлиста.`,
    FRIEND_REQUESTED: () => `Заявка в друзья отправлена.`,
    FRIEND_ACCEPTED: () => `Заявка принята — теперь вы друзья.`,
    FRIEND_REMOVED: () => `Удалён из друзей.`,
  },
  KK: {
    CREATED_OK: (e) => `${e} сәтті құрылды.`,
    UPDATED_OK: (e) => `${e} сәтті жаңартылды.`,
    DELETED_OK: (e) => `${e} сәтті жойылды.`,
    NOT_FOUND: (e) => `${e} табылмады.`,
    ALREADY_EXISTS: (e) => `Мұндай идентификаторы бар ${e} бұрыннан бар.`,
    UNEXPECTED: () => `Күтпеген қате. Кейінірек қайталап көріңіз.`,
    VALIDATION_FAILED: () =>
      `Тексеру қатесі. Енгізілген деректерді тексеріңіз.`,
    PHOTO_OR_LINK_REQUIRED: () =>
      `Фото немесе сілтеме қосыңыз — тілекте екеуінің кемінде біреуі болуы керек.`,
    IMAGE_INVALID: () =>
      `Фотоны оқу мүмкін болмады. 10 МБ-қа дейінгі JPEG, PNG немесе WebP жіберіңіз.`,
    TOO_MANY_IMAGES: () => `Фото тым көп — бір тілекке 8-ден аспауы керек.`,
    PRICE_TOO_LARGE: () =>
      `Баға тым үлкен — 9 999 999 999-дан аспайтын мән енгізіңіз.`,
    SELF_RESERVED_OK: (e) => `Өз ${e} бронь ретінде белгіледіңіз.`,
    FORBIDDEN: () => `Бұл әрекетті орындауға рұқсатыңыз жоқ.`,
    STATUS_CONFLICT: (e) =>
      `${e} күйін өзгерту жарамсыз немесе ол бұрыннан өңделген.`,
    RESERVED_OK: (e) => `${e} сәтті брондалды.`,
    UNRESERVED_OK: (e) => `${e} үшін бронь алынды.`,
    ORDERED_OK: (e) => `${e} «сатып алынды» ретінде белгіленді.`,
    FULFILLED_OK: (e) => `${e} «орындалды» ретінде белгіленді.`,
    SUBSCRIBED_OK: () => `Сіз бұл тілектер тізіміне жазылдыңыз.`,
    UNSUBSCRIBED_OK: () => `Сіз бұл тілектер тізімінен бас тарттыңыз.`,
    FRIEND_REQUESTED: () => `Достыққа өтінім жіберілді.`,
    FRIEND_ACCEPTED: () => `Өтінім қабылданды — енді сіздер доссыздар.`,
    FRIEND_REMOVED: () => `Достардан өшірілді.`,
  },
};

export function t(
  key: MessageKey,
  locale: LocaleLike,
  entityLabel: string,
): string {
  const lang = normalizeLocale(locale);
  return dict[lang][key](entityLabel);
}
