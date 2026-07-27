import type { WishVisibility } from '@prisma/client';

export const WISH_CREATED = 'wish.created';

export class WishCreatedEvent {
  constructor(
    public readonly wishId: string,
    public readonly ownerId: number,
    public readonly name: string,
    public readonly visibility: WishVisibility,
  ) {}
}
