import { level, type Profile } from './world.js';
import { SKILLS, SKILL_IDS, isSkill, skillXp, type SkillId } from './skills.js';
type BoardMeta = {
    name: string;
    primary: string;
    secondary: string;
    rules: string;
    empty: string;
};
export const SCORE_BOARDS = {
    overall: { name: 'Overall', primary: 'Total level', secondary: 'Total XP', rules: 'Total level combines all 25 skills. Ranked by total level, then total XP. Earn XP to enter the board.', empty: 'Bank a haul, craft an item or train combat to earn your first overall rank.' },
    pve: { name: 'PvE combat', primary: 'Combat level', secondary: 'Combat XP', rules: 'Ranked by lifetime combat XP, then boss and enemy defeats. Legacy combat XP is retained; separate defeat counters start from the market update.', empty: 'Defeat an enemy to enter the PvE board.' },
    pvp: { name: 'PvP combat', primary: 'PvP points', secondary: 'Player KOs', rules: '100 points per duel knockout; 25 per open-world kill. The same opponent grants points once per 10 minutes. Forfeits, disconnects and ring exits grant no points.', empty: 'Win a duel by knockout or defeat a player in the crossing to earn PvP points.' },
    bosses: { name: 'Boss defeats', primary: 'Boss defeats', secondary: 'Combat XP', rules: 'Ranked by credited boss defeats, then combat XP. Recent living contributors near the boss each receive credit.', empty: 'Defeat the Hollow Warden to enter this board.' },
    duels: { name: 'Duel knockouts', primary: 'Duel KOs', secondary: 'Wins / losses', rules: 'Ranked by duel knockouts, then PvP points. The record includes forfeits; only combat knockouts count toward this category.', empty: 'Win a wagered duel by knockout to enter this board.' },
    woodcutting: { name: 'Woodcutting', primary: 'Skill level', secondary: 'Woodcutting XP', rules: 'Ranked by banked woodcutting XP. Gathering in the field and buying wood grant no XP.', empty: 'Gather wood and bank it to enter the Woodcutting board.' },
    mining: { name: 'Mining', primary: 'Skill level', secondary: 'Mining XP', rules: 'Ranked by banked mining XP. Gathering in the field and buying ore grant no XP.', empty: 'Gather ore and bank it to enter the Mining board.' },
    ...Object.fromEntries(SKILL_IDS.filter(s => !['combat', 'woodcutting', 'mining'].includes(s)).map(s => [s, { name: SKILLS[s].name, primary: 'Skill level', secondary: `${SKILLS[s].name} XP`, rules: SKILLS[s].training, empty: `Train ${SKILLS[s].name} to earn a rank. Open Skills (K) for instructions.` }])) as Record<Exclude<SkillId, 'combat' | 'woodcutting' | 'mining'>, BoardMeta>
} as const;
export type ScoreBoard = keyof typeof SCORE_BOARDS;
export const isScoreBoard = (value: unknown): value is ScoreBoard => typeof value === 'string' && Object.hasOwn(SCORE_BOARDS, value);
export type ScoreEntry = {
    publicId: string;
    name: string;
    score: number;
    pveKills: number;
    bossKills: number;
    pvpKills: number;
    duelKnockouts: number;
    duelWins: number;
    duelLosses: number;
    online: boolean;
    rank: number;
    combatXp: number;
    woodXp: number;
    oreXp: number;
    totalLevel: number;
    totalXp: number;
};
export type Leaderboards = {
    pve: ScoreEntry[];
    pvp: ScoreEntry[];
};
export function rankPlayers(saved: Iterable<Profile>, live: Iterable<Profile>, board: ScoreBoard): ScoreEntry[] {
    const merged = new Map<string, Profile>();
    for (const p of saved)
        if (p.publicId)
            merged.set(p.publicId, p);
    const online = new Set<string>();
    for (const p of live)
        if (p.publicId) {
            merged.set(p.publicId, p);
            online.add(p.publicId);
        }
    const entries = [...merged.values()].map(p => ({ publicId: p.publicId, name: p.name, score: isSkill(board) ? skillXp(p, board) : board === 'overall' ? SKILL_IDS.reduce((n, s) => n + level(skillXp(p, s)), 0) : board === 'pve' ? p.combatXp : board === 'pvp' ? p.pvpScore : board === 'bosses' ? p.bossKills : p.duelKnockouts, combatXp: p.combatXp, woodXp: p.xp.wood, oreXp: p.xp.ore, totalLevel: SKILL_IDS.reduce((n, s) => n + level(skillXp(p, s)), 0), totalXp: SKILL_IDS.reduce((n, s) => n + skillXp(p, s), 0), pveKills: p.pveKills, bossKills: p.bossKills, pvpKills: p.pvpKills, duelKnockouts: p.duelKnockouts, duelWins: p.duelWins, duelLosses: p.duelLosses, online: online.has(p.publicId), rank: 0 }));
    const tie = (a: ScoreEntry, b: ScoreEntry) => a.name.localeCompare(b.name, 'en') || a.publicId.localeCompare(b.publicId);
    return entries.filter(e => board === 'overall' ? e.totalXp > 0 : e.score > 0).sort((a, b) => b.score - a.score || (board === 'overall' ? b.totalXp - a.totalXp : board === 'pve' ? b.bossKills - a.bossKills || b.pveKills - a.pveKills : board === 'pvp' ? b.duelKnockouts - a.duelKnockouts || b.pvpKills - a.pvpKills : board === 'bosses' ? b.combatXp - a.combatXp : board === 'duels' ? merged.get(b.publicId)!.pvpScore - merged.get(a.publicId)!.pvpScore : 0) || tie(a, b)).map((e, i) => ({ ...e, rank: i + 1 }));
}
export function buildLeaderboards(saved: Iterable<Profile>, live: Iterable<Profile>): Leaderboards { const stored = [...saved], online = [...live]; return { pve: rankPlayers(stored, online, 'pve').slice(0, 10), pvp: rankPlayers(stored, online, 'pvp').slice(0, 10) }; }
export type ScorePage = {
    board: ScoreBoard;
    requestId: number;
    entries: ScoreEntry[];
    self: ScoreEntry | null;
    total: number;
    matches: number;
    page: number;
    pages: number;
    query: string;
    highlightId: string;
    error: string;
};
export function queryScores(saved: Iterable<Profile>, live: Iterable<Profile>, selfId: string, raw: unknown): ScorePage {
    const m = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const board = isScoreBoard(m.board) ? m.board : 'overall', rows = rankPlayers(saved, live, board), self = rows.find(e => e.publicId === selfId) ?? null;
    const result: ScorePage = { board, requestId: typeof m.requestId === 'number' && Number.isSafeInteger(m.requestId) ? m.requestId : 0, entries: [], self, total: rows.length, matches: rows.length, page: 1, pages: Math.max(1, Math.ceil(rows.length / 25)), query: '', highlightId: '', error: '' };
    if (!isScoreBoard(m.board)) {
        result.error = 'Choose an available category.';
        return result;
    }
    let found = rows, page = typeof m.page === 'number' && Number.isSafeInteger(m.page) && m.page > 0 ? m.page : 1;
    if (m.view === 'name') {
        result.query = typeof m.query === 'string' ? m.query.trim().slice(0, 16) : '';
        if (result.query)
            found = rows.filter(e => e.name.toLowerCase().includes(result.query.toLowerCase()));
    }
    else if (m.view === 'rank') {
        if (typeof m.rank !== 'number' || !Number.isSafeInteger(m.rank) || m.rank < 1 || m.rank > rows.length) {
            result.error = rows.length ? `Enter a rank from 1 to ${rows.length.toLocaleString()}.` : 'No ranks have been earned in this category yet.';
        }
        else {
            page = Math.ceil(m.rank / 25);
            result.highlightId = rows[m.rank - 1].publicId;
        }
    }
    else if (m.view === 'self') {
        if (self) {
            page = Math.ceil(self.rank / 25);
            result.highlightId = selfId;
        }
        else
            result.error = 'You have not earned a rank in this category yet.';
    }
    result.matches = found.length;
    result.pages = Math.max(1, Math.ceil(found.length / 25));
    result.page = Math.max(1, Math.min(result.pages, page));
    result.entries = found.slice((result.page - 1) * 25, result.page * 25);
    return result;
}
