import { SCORE_BOARDS, type ScoreBoard, type ScorePage, type ScoreEntry } from '../shared/leaderboards.js';
import { level, type Snapshot } from '../shared/world.js';
import { isSkill } from '../shared/skills.js';
const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const make = <K extends keyof HTMLElementTagNameMap>(tag: K, text: string) => { const e = document.createElement(tag); e.textContent = text; return e; };
export class ScoreView {
    private board: ScoreBoard = 'overall';
    private view = 'page';
    private page = 1;
    private query = '';
    private rank = 1;
    private requestId = 0;
    private at = 0;
    private playerId = '';
    private result?: ScorePage;
    private reveal = false;
    private pending = false;
    constructor(private send: (m: Record<string, unknown>) => void) {
        for (const [board, meta] of Object.entries(SCORE_BOARDS)) {
            const b = make('button', '');
            b.type = 'button';
            b.dataset.board = board;
            b.setAttribute('aria-pressed', String(board === this.board));
            const marks: Record<string, string> = { overall: 'ALL', pve: 'PVE', pvp: 'PVP', bosses: 'B', duels: 'D', woodcutting: 'W', mining: 'M' };
            const mark = make('span', marks[board] ?? meta.name.slice(0, 2).toUpperCase());
            mark.className = 'category-mark';
            mark.setAttribute('aria-hidden', 'true');
            b.append(mark, make('span', meta.name));
            b.addEventListener('click', () => { this.board = board as ScoreBoard; this.view = 'page'; this.page = 1; this.query = ''; get<HTMLInputElement>('score-name').value = ''; get<HTMLInputElement>('score-rank').value = ''; this.result = undefined; this.configure(); this.refresh(); });
            get('score-categories').append(b);
        }
        get('score-name-form').addEventListener('submit', e => { e.preventDefault(); this.query = get<HTMLInputElement>('score-name').value.trim(); this.view = this.query ? 'name' : 'page'; this.page = 1; this.refresh(); });
        get('score-rank-form').addEventListener('submit', e => { e.preventDefault(); this.rank = Number(get<HTMLInputElement>('score-rank').value); this.view = 'rank'; this.page = 1; this.refresh(); });
        get('score-find-self').addEventListener('click', () => { this.view = 'self'; this.page = 1; this.refresh(); });
        get('score-clear').addEventListener('click', () => { this.view = 'page'; this.query = ''; this.page = 1; get<HTMLInputElement>('score-name').value = ''; get<HTMLInputElement>('score-rank').value = ''; this.refresh(); });
        for (const [button, delta] of [['score-prev', -1], ['score-next', 1]] as const)
            get(button).addEventListener('click', () => {
                this.page += delta;
                if (this.view !== 'name')
                    this.view = 'page';
                this.refresh();
            });
        this.configure();
    }
    open() { this.configure(); this.refresh(); }
    update(s: Snapshot, id: string) {
        this.playerId = s.players.find(p => p.id === id)?.publicId ?? '';
        if (get<HTMLDialogElement>('scores').open && Date.now() - this.at >= 1500)
            this.refresh(true);
    }
    refresh(background = false) {
        if (background && this.pending && Date.now() - this.at < 5000)
            return;
        this.at = Date.now();
        if (!this.playerId) {
            get('score-status').textContent = 'Enter the crossing to view rankings.';
            return;
        }
        this.pending = true;
        this.reveal = !background;
        this.requestId++;
        if (!this.result) {
            get('score-status').textContent = 'Loading rankings…';
            get('score-rows').replaceChildren();
            get<HTMLButtonElement>('score-prev').disabled = true;
            get<HTMLButtonElement>('score-next').disabled = true;
        }
        this.send({ type: 'scores', requestId: this.requestId, board: this.board, view: this.view, page: this.page, query: this.query, rank: this.rank });
    }
    private configure() {
        const meta = SCORE_BOARDS[this.board];
        get('score-category-title').textContent = `${meta.name} high scores`;
        get('score-rules').textContent = meta.rules;
        get('score-primary-heading').textContent = meta.primary;
        get('score-secondary-heading').textContent = meta.secondary;
        for (const b of document.querySelectorAll<HTMLButtonElement>('[data-board]'))
            b.setAttribute('aria-pressed', String(b.dataset.board === this.board));
    }
    receive(r: ScorePage) {
        if (r.requestId !== this.requestId || r.board !== this.board)
            return;
        this.pending = false;
        this.result = r;
        this.page = r.page;
        get('score-total').textContent = `${r.total.toLocaleString()} ranked ${r.total === 1 ? 'player' : 'players'}`;
        get('score-status').textContent = r.error || (r.query ? `${r.matches.toLocaleString()} ${r.matches === 1 ? 'match' : 'matches'} for “${r.query}” · global ranks shown` : 'Lifetime rankings · saved and online players');
        get('score-status').classList.toggle('score-error', !!r.error);
        get<HTMLButtonElement>('score-clear').disabled = this.view === 'page' && !this.query;
        get('score-page').textContent = `Page ${r.page} / ${r.pages}`;
        get<HTMLButtonElement>('score-prev').disabled = r.page <= 1;
        get<HTMLButtonElement>('score-next').disabled = r.page >= r.pages;
        const self = r.self;
        get('score-your-rank').textContent = self ? `#${self.rank.toLocaleString()}` : 'Unranked';
        get('score-your-value').textContent = self ? `${SCORE_BOARDS[this.board].primary}: ${this.values(self)[0]}` : 'Earn a score in this category';
        get('score-rows').replaceChildren(...r.entries.map(e => {
            const tr = document.createElement('tr');
            if (e.publicId === this.playerId)
                tr.classList.add('your-score');
            if (e.publicId === r.highlightId)
                tr.classList.add('located-score');
            const rank = make('td', String(e.rank)), name = document.createElement('td'), label = make('span', e.name), dot = make('i', '');
            label.className = 'ranked-name';
            label.title = e.name;
            dot.className = e.online ? 'rank-online' : 'rank-offline';
            dot.title = e.online ? 'Online' : 'Offline';
            dot.setAttribute('aria-label', dot.title);
            name.append(dot, label);
            if (e.publicId === this.playerId) {
                const you = make('span', 'YOU');
                you.className = 'rank-you';
                name.append(you);
            }
            const [a, b] = this.values(e);
            tr.append(rank, name, make('td', a), make('td', b));
            return tr;
        }));
        if (this.reveal) {
            const scroll = get('score-rows').closest('.score-table-wrap') as HTMLElement;
            scroll.scrollTop = 0;
            scroll.querySelector<HTMLElement>('.located-score')?.scrollIntoView({ block: 'center' });
            this.reveal = false;
        }
        get('score-empty').textContent = r.query && !r.entries.length ? 'No ranked players match that name. Try a shorter name or clear the search.' : SCORE_BOARDS[this.board].empty;
        get('score-empty').classList.toggle('hidden', r.entries.length > 0);
    }
    private values(e: ScoreEntry): [
        string,
        string
    ] {
        const n = (v: number) => v.toLocaleString();
        switch (this.board) {
            case 'overall': return [n(e.totalLevel), n(e.totalXp)];
            case 'pve': return [n(level(e.combatXp)), n(e.combatXp)];
            case 'pvp': return [n(e.score), n(e.duelKnockouts + e.pvpKills)];
            case 'bosses': return [n(e.bossKills), n(e.combatXp)];
            case 'duels': return [n(e.duelKnockouts), `${n(e.duelWins)} / ${n(e.duelLosses)}`];
            case 'woodcutting': return [n(level(e.woodXp)), n(e.woodXp)];
            case 'mining': return [n(level(e.oreXp)), n(e.oreXp)];
            default: return [n(level(e.score)), n(e.score)];
        }
    }
}
