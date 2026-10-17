// Direct cosmetic purchases only. USD prices are server-owned; payment mode is configured separately.
export const PRODUCTS = [
    { id: 'sunset-name', name: 'Sunset nameplate', cents: 499, color: '#f2b27e', description: 'Warm copper lettering above your character. No stats or trade value.' },
    { id: 'glacier-name', name: 'Glacier nameplate', cents: 499, color: '#91deef', description: 'Icy blue lettering above your character. No stats or trade value.' }
] as const;
export const SHOP = { enabled: false, mode: 'test', currency: 'USD', products: PRODUCTS,
    message: 'Test store. Checkout requires verified email sign-in and provider configuration.',
    rules: ['Cosmetic appearances only. All combat slots remain free.',
        'No paid coins, gear, random loot, cash-out or conversion into duel stakes.',
        'Earned coins remain the only auction and duel currency.',
        'Appearances belong to the account and cannot be sold or traded.'] } as const;
