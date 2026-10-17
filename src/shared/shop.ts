// A reviewable catalog, not a payment or grant API. All combat slots are free.
export const SHOP = {
    enabled: false,
    currency: 'Crowns',
    message: 'Shop concept only. Purchases and paid currency are unavailable.',
    products: [
        { id: 'ember-trail', name: 'Ember footfalls', kind: 'Cosmetic', description: 'A proposed walking trail. No damage, burning or combat bonus.' },
        { id: 'frost-cloak', name: 'Winter cloak appearance', kind: 'Cosmetic', description: 'A proposed armor appearance. Does not grant chill or armor.' },
        { id: 'bank-tab', name: 'Extra bank tab', kind: 'Storage', description: 'A possible future storage expansion. Never increases the 12-resource risk pouch or combat slots.' }
    ],
    rules: ['Every combat equipment slot is unlocked for everyone.', 'Earned coins remain the only auction and duel currency.',
        'Crowns would be non-tradeable and cannot be wagered, cashed out or converted to earned coins.',
        'No paid gear, random paid loot or checkout is implemented. Pricing is undecided.']
} as const;
