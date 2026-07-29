export const WISH_UPDATED = 'wish.updated';

/**
 * Владелец отредактировал забронированное/заказанное желание — даритель
 * должен узнать, что содержимое изменилось. Эмитится только когда есть
 * реальный бронирующий (не сам владелец) и менялись содержательные поля.
 */
export class WishUpdatedEvent {
  constructor(
    public readonly wishId: string,
    public readonly ownerId: number,
    public readonly name: string,
    public readonly reserverUserId: number,
  ) {}
}
