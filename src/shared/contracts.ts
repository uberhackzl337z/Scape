// New prototype contracts. Only successful authoritative actions advance this ledger.
export const CONTRACTS = [
    { id: 'first-haul', name: 'Bring it home', hint: 'Hold E at resource sites, then inside the central bank.', reward: 30, objectives: [{ event: 'gather', target: 4, label: 'Gather resources from sites' }, { event: 'bank', target: 4, label: 'Bank carried resources' }] },
    { id: 'workshop', name: 'Supply the expedition', hint: 'K opens the bank workshop. Make planks or bars from stored wood or ore.', reward: 45, objectives: [{ event: 'craft', target: 2, label: 'Craft planks or metal bars' }] },
    { id: 'patrol', name: 'Clear the crossing', hint: 'Defeat monsters as a nearby living contributor. Player defeats do not count.', reward: 60, objectives: [{ event: 'monster', target: 3, label: 'Defeat ordinary monsters' }] },
    { id: 'warden', name: 'The Hollow expedition', hint: 'Contribute to the Warden defeat and remain alive nearby. Watch its locked red warnings.', reward: 120, objectives: [{ event: 'boss', target: 1, label: 'Defeat the Hollow Warden' }] }
] as const;
export type ContractEvent = 'gather' | 'bank' | 'craft' | 'monster' | 'boss';
export type Journal = {
    progress: Record<string, number[]>;
    claimed: string[];
};
export function freshJournal(): Journal { return { progress: {}, claimed: [] }; }
export function readJournal(raw: unknown): Journal {
    if (raw === undefined)
        return freshJournal();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        throw new Error('Invalid contract journal');
    const j = raw as Journal;
    if (!j.progress || typeof j.progress !== 'object' || Array.isArray(j.progress) || !Array.isArray(j.claimed) || new Set(j.claimed).size !== j.claimed.length)
        throw new Error('Invalid contract journal');
    const result = freshJournal();
    for (const key of Object.keys(j.progress)) {
        const c = CONTRACTS.find(c => c.id === key), values = j.progress[key];
        if (!c || !Array.isArray(values) || values.length !== c.objectives.length || values.some((n, i) => !Number.isSafeInteger(n) || n < 0 || n > c.objectives[i].target))
            throw new Error('Invalid contract progress');
        result.progress[key] = [...values];
    }
    for (const id of j.claimed) {
        const c = CONTRACTS.find(c => c.id === id);
        if (!c || !complete(result, id))
            throw new Error('Invalid contract claim');
        result.claimed.push(id);
    }
    CONTRACTS.forEach((c, index) => {
        if (!unlocked(result, index) && (result.claimed.includes(c.id) || result.progress[c.id]?.some(n => n > 0)))
            throw new Error('Invalid locked contract progress');
    });
    return result;
}
export function unlocked(j: Journal, index: number) { return index === 0 || j.claimed.includes(CONTRACTS[index - 1].id); }
export function complete(j: Journal, id: string) {
    const c = CONTRACTS.find(c => c.id === id);
    return !!c && c.objectives.every((o, i) => (j.progress[id]?.[i] ?? 0) >= o.target);
}
export function advance(j: Journal, event: ContractEvent, amount: number) {
    CONTRACTS.forEach((c, index) => {
        if (!unlocked(j, index) || j.claimed.includes(c.id))
            return;
        c.objectives.forEach((o, i) => {
            if (o.event !== event)
                return;
            const values = j.progress[c.id] ??= c.objectives.map(() => 0);
            values[i] = Math.min(o.target, values[i] + amount);
        });
    });
}
