// ============= SUPABASE =============
const SUPABASE_URL = "https://ndxjdmkeounxliifpbyw.supabase.co";
const SUPABASE_ANON = "sb_publishable_7k4luMzyb2t3LNeHSF8WBQ_bLZB4KNc";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ============= UI HOOKS ============
const $ = (s) => document.querySelector(s);
const lobby = $("#lobby");
const game = $("#game");
const codeLbl = $("#codeLbl");
const turnLbl = $("#turnLbl");
const presenceBox = $("#presence");
const playersList = $("#playersList");
const logEl = $("#log");
const rollBtn = $("#rollBtn");
const buyBtn = $("#buyBtn");
const endBtn = $("#endBtn");
const youAre = $("#youAre");

// create board container
const boardHost = document.createElement("div");
boardHost.className = "board-inner";
document.querySelector(".board").appendChild(boardHost);

$("#createBtn").onclick = createRoom;
$("#joinBtn").onclick = joinRoom;
rollBtn.onclick = rollDice;
buyBtn.onclick = buyProperty;
endBtn.onclick = endTurn;

// ============= GAME DATA ============
const START_MONEY = 1500;

// Real Monopoly-like order (0..39), starting at GO (bottom-right) counter-clockwise
const BOARD = [
    { t: "go", name: "GO" },
    { t: "prop", name: "Mediterranean Ave", price: 60, rent: 8, color: "brown" },
    { t: "chest", name: "Community Chest" },
    { t: "prop", name: "Baltic Ave", price: 60, rent: 8, color: "brown" },
    { t: "tax", name: "Income Tax", amount: 200 },
    { t: "rail", name: "Reading Railroad", price: 200, rent: 25, color: "black" },
    { t: "prop", name: "Oriental Ave", price: 100, rent: 10, color: "lblue" },
    { t: "chance", name: "Chance" },
    { t: "prop", name: "Vermont Ave", price: 100, rent: 10, color: "lblue" },
    { t: "prop", name: "Connecticut Ave", price: 120, rent: 12, color: "lblue" },
    { t: "jail", name: "Jail / Just Visiting" },
    { t: "prop", name: "St. Charles Place", price: 140, rent: 12, color: "pink" },
    { t: "util", name: "Electric Company", price: 150, rent: 12, color: "black" },
    { t: "prop", name: "States Ave", price: 140, rent: 12, color: "pink" },
    { t: "prop", name: "Virginia Ave", price: 160, rent: 14, color: "pink" },
    { t: "rail", name: "Pennsylvania Railroad", price: 200, rent: 25, color: "black" },
    { t: "prop", name: "St. James Place", price: 180, rent: 14, color: "orange" },
    { t: "chest", name: "Community Chest" },
    { t: "prop", name: "Tennessee Ave", price: 180, rent: 14, color: "orange" },
    { t: "prop", name: "New York Ave", price: 200, rent: 16, color: "orange" },
    { t: "free", name: "Free Parking" },
    { t: "prop", name: "Kentucky Ave", price: 220, rent: 18, color: "red" },
    { t: "chance", name: "Chance" },
    { t: "prop", name: "Indiana Ave", price: 220, rent: 18, color: "red" },
    { t: "prop", name: "Illinois Ave", price: 240, rent: 20, color: "red" },
    { t: "rail", name: "B. & O. Railroad", price: 200, rent: 25, color: "black" },
    { t: "prop", name: "Atlantic Ave", price: 260, rent: 22, color: "yellow" },
    { t: "prop", name: "Ventnor Ave", price: 260, rent: 22, color: "yellow" },
    { t: "util", name: "Water Works", price: 150, rent: 12, color: "black" },
    { t: "prop", name: "Marvin Gardens", price: 280, rent: 24, color: "yellow" },
    { t: "gojail", name: "Go to Jail" },
    { t: "prop", name: "Pacific Ave", price: 300, rent: 26, color: "green" },
    { t: "prop", name: "North Carolina Ave", price: 300, rent: 26, color: "green" },
    { t: "chest", name: "Community Chest" },
    { t: "prop", name: "Pennsylvania Ave", price: 320, rent: 28, color: "green" },
    { t: "rail", name: "Short Line", price: 200, rent: 25, color: "black" },
    { t: "chance", name: "Chance" },
    { t: "prop", name: "Park Place", price: 350, rent: 35, color: "dblue" },
    { t: "tax", name: "Luxury Tax", amount: 100 },
    { t: "prop", name: "Boardwalk", price: 400, rent: 50, color: "dblue" },
];

// ============= STATE =============
let channel = null;
let roomCode = "";
let me = null;
let state = null; // {code, players[], turnIdx, props{}, started, log[]}
const deviceId = getOrCreateDeviceId();

// ============= HELPERS ============
function getOrCreateDeviceId() {
    const k = "monopoly_device_id";
    let v = localStorage.getItem(k);
    if (!v) { v = crypto.randomUUID(); localStorage.setItem(k, v); }
    return v;
}
function randCode() {
    const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 4 }, () => a[Math.floor(Math.random() * a.length)]).join("");
}
function log(msg) {
    const time = new Date().toLocaleTimeString();
    state.log.push(`[${time}] ${msg}`); renderLog();
}
function escapeHtml(s) { return s.replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[m])); }

// ============= LAYOUT (11x11 perimetru) ============
function layoutForIndex(i) {
    // 0 at bottom-right; go CCW
    if (i === 0) return { row: 11, col: 11, side: "bottom", corner: true };
    if (i <= 9) return { row: 11, col: 11 - i, side: "bottom" };
    if (i === 10) return { row: 11, col: 1, side: "left", corner: true };
    if (i <= 19) return { row: 11 - (i - 10), col: 1, side: "left" };
    if (i === 20) return { row: 1, col: 1, side: "top", corner: true };
    if (i <= 29) return { row: 1, col: (i - 20) + 1, side: "top" };
    if (i === 30) return { row: 1, col: 11, side: "right", corner: true };
    // 31..39
    return { row: (i - 30) + 1, col: 11, side: "right" };
}

// ============= RENDER ============
function renderBoard() {
    boardHost.innerHTML = "";
    for (let i = 0; i < 40; i++) {
        const t = BOARD[i];
        const pos = layoutForIndex(i);
        const el = document.createElement("div");
        el.className = `tile side-${pos.side} ${pos.corner ? "corner" : ""} ${t.t === "prop" ? "prop" : ""}`;
        el.style.gridRow = pos.row;
        el.style.gridColumn = pos.col;

        // proprietăți – bandă colorată
        let band = "";
        if (t.t === "prop") {
            band = `<div class="band ${t.color || ""}"></div>`;
        }

        // owners + pawn render
        const owners = document.createElement("div");
        owners.className = "owners";
        state?.players?.forEach(p => {
            if (p.bankrupt) return;
            if (p.pos === i) {
                const s = document.createElement("span");
                s.className = "pawn"; s.textContent = p.pawn || "🔹";
                owners.appendChild(s);
            }
        });

        // badge proprietar (Liber/Deținut)
        let ownBadge = "";
        if (t.t === "prop") {
            const ownerId = state?.props?.[i] || null;
            ownBadge = `<div class="badge" style="position:absolute;left:4px;bottom:4px">${ownerId ? "Deținut" : "Liber"}</div>`;
        }

        // conținut text (rotit după latură)
        let priceLine = "";
        if (t.t === "prop") priceLine = `<div class="price">$${t.price} • Rent ${t.rent}</div>`;
        if (t.t === "tax") priceLine = `<div class="price">Taxă $${t.amount}</div>`;
        if (t.t === "go") priceLine = `<div class="price">+200 la trecere</div>`;
        if (t.t === "gojail") priceLine = `<div class="price">Trimis la închisoare</div>`;

        el.innerHTML = `
      ${band}
      <div class="content">
        <div class="name">${i}. ${escapeHtml(t.name)}</div>
        ${priceLine}
      </div>
      ${ownBadge}
    `;
        el.appendChild(owners);
        boardHost.appendChild(el);
    }
}

function renderPlayers() {
    if (!state) return;
    playersList.innerHTML = state.players.map((p, idx) => {
        const turn = idx === state.turnIdx ? " (tura)" : "";
        const dead = p.bankrupt ? "❌" : "";
        const cls = p.id === me.id ? "me" : "";
        return `<li class="${cls}"><span>${p.pawn || "🔹"} ${escapeHtml(p.nick)}${turn}</span><span>${dead} $${p.money}</span></li>`;
    }).join("");
    turnLbl.textContent = state.players[state.turnIdx]?.nick || "-";
    youAre.textContent = `Tu ești: ${me?.pawn || "🔹"} ${me?.nick || ""}`;
}
function renderPresence(pres) { const list = Object.values(pres).flatMap(x => x).map(m => m.nick); presenceBox.textContent = `Online: ${list.join(", ")}`; }
function renderLog() { logEl.innerHTML = state.log.slice(-200).map(l => `<div>${escapeHtml(l)}</div>`).join(""); logEl.scrollTop = logEl.scrollHeight; }
function renderAll() { renderBoard(); renderPlayers(); renderLog(); updateActionButtons(); }
function updateActionButtons() {
    const myTurn = state.players[state.turnIdx]?.id === me.id && !me.bankrupt;
    rollBtn.disabled = !myTurn;
}

// ============= ROOM FLOW ============
async function createRoom() {
    const nick = ($("#nick").value || "").trim() || "Guest";
    roomCode = ($("#roomCode").value || "").trim().toUpperCase() || randCode();
    me = { id: deviceId, nick, pawn: pickPawn() };

    state = {
        code: roomCode,
        players: [{ id: me.id, nick: me.nick, pawn: me.pawn, money: START_MONEY, pos: 0, bankrupt: false }],
        turnIdx: 0, props: {}, started: false, log: []
    };
    await upsertState(); await openChannel(); enterGameUI(); renderAll();
    log(`Camera ${roomCode} creată de ${me.nick}. Invită 1-3 prieteni.`);
}
async function joinRoom() {
    const nick = ($("#nick").value || "").trim() || "Guest";
    roomCode = ($("#roomCode").value || "").trim().toUpperCase();
    if (!roomCode) { alert("Introdu codul camerei"); return; }
    me = { id: deviceId, nick, pawn: pickPawn() };

    const { data, error } = await supabase.from("games").select("state").eq("code", roomCode).maybeSingle();
    if (error) { alert("Eroare la încărcarea camerei"); console.error(error); return; }
    state = data ? data.state : { code: roomCode, players: [], turnIdx: 0, props: {}, started: false, log: [] };
    if (!data) await upsertState();

    if (!state.players.find(p => p.id === me.id)) {
        if (state.players.length >= 4) { alert("Camera e plină (max 4)"); return; }
        state.players.push({ id: me.id, nick: me.nick, pawn: me.pawn, money: START_MONEY, pos: 0, bankrupt: false });
        await commitState(`S-a alăturat ${me.nick}`);
    }
    await openChannel(); enterGameUI(); renderAll();
}
async function openChannel() {
    if (channel) await channel.unsubscribe();
    channel = supabase.channel(`room:${roomCode}`, { config: { presence: { key: me.id } } });
    channel.on("presence", { event: "sync" }, () => renderPresence(channel.presenceState()));
    channel.on("broadcast", { event: "state" }, ({ payload }) => { state = payload; renderAll(); });
    await channel.subscribe((st) => { if (st === "SUBSCRIBED") channel.track({ id: me.id, nick: me.nick }); });
}
function enterGameUI() { lobby.classList.add("hidden"); game.classList.remove("hidden"); codeLbl.textContent = roomCode; }

// ============= GAMEPLAY ============
function currentPlayer() { return state.players[state.turnIdx]; }
function nextTurn() {
    let n = state.turnIdx;
    for (let i = 0; i < state.players.length; i++) {
        n = (n + 1) % state.players.length; if (!state.players[n].bankrupt) break;
    } state.turnIdx = n;
}
function pickPawn() { const pawns = ["🔴", "🟣", "🟢", "🔵", "🟡", "🟠", "⚪", "🟤"]; return pawns[Math.floor(Math.random() * pawns.length)]; }

async function rollDice() {
    const myTurn = currentPlayer().id === me.id && !me.bankrupt; if (!myTurn) return;
    const d1 = 1 + Math.floor(Math.random() * 6), d2 = 1 + Math.floor(Math.random() * 6), steps = d1 + d2;
    const p = currentPlayer(); const before = p.pos;
    p.pos = (p.pos + steps) % 40;
    if (p.pos < before) { p.money += 200; log(`${p.nick} trece pe GO și primește $200`); }
    log(`${p.nick} a dat ${d1} + ${d2} = ${steps} și a ajuns pe ${p.pos}.`);
    await applyTile(p); updateMeRef(); await commitState();
}

async function applyTile(p) {
    const t = BOARD[p.pos]; if (!t) return;

    if (t.t === "tax") { p.money -= t.amount; log(`${p.nick} plătește taxă $${t.amount}.`); checkBankrupt(p); endBtn.classList.remove("hidden"); }
    else if (t.t === "gojail") { p.pos = 10; log(`${p.nick} merge direct la închisoare.`); endBtn.classList.remove("hidden"); }
    else if (t.t === "prop" || t.t === "rail" || t.t === "util") {
        const idx = p.pos;
        const ownerId = state.props[idx] || null;
        if (!ownerId) { buyBtn.classList.remove("hidden"); endBtn.classList.remove("hidden"); buyBtn.dataset.tile = String(idx); }
        else if (ownerId !== p.id) {
            const owner = state.players.find(x => x.id === ownerId);
            const rent = t.rent ?? 10;
            if (owner && !owner.bankrupt) { p.money -= rent; owner.money += rent; log(`${p.nick} plătește chirie $${rent} către ${owner.nick}.`); checkBankrupt(p); }
            endBtn.classList.remove("hidden");
        } else { endBtn.classList.remove("hidden"); }
    }
    else { // go, jail(visiting), free, chance, chest
        endBtn.classList.remove("hidden");
    }
}
async function buyProperty() {
    const myTurn = currentPlayer().id === me.id && !me.bankrupt; if (!myTurn) return;
    const idx = Number(buyBtn.dataset.tile || "-1"); if (idx < 0) return;
    const t = BOARD[idx]; if (!["prop", "rail", "util"].includes(t.t)) return;
    const ownerId = state.props[idx] || null; if (ownerId) { buyBtn.classList.add("hidden"); return; }
    const p = currentPlayer(); const price = t.price ?? 100;
    if (p.money < price) { log(`${p.nick} nu are bani suficienți pentru ${t.name}.`); buyBtn.classList.add("hidden"); return; }
    p.money -= price; state.props[idx] = p.id; log(`${p.nick} cumpără ${t.name} pentru $${price}.`);
    buyBtn.classList.add("hidden"); updateMeRef(); await commitState();
}
async function endTurn() {
    const myTurn = currentPlayer().id === me.id && !me.bankrupt; if (!myTurn) return;
    buyBtn.classList.add("hidden"); endBtn.classList.add("hidden"); nextTurn(); await commitState(`${currentPlayer().nick} este la mutare.`);
}
function checkBankrupt(p) {
    if (p.money < 0) { p.bankrupt = true; for (const [k, v] of Object.entries(state.props)) { if (v === p.id) delete state.props[k]; } log(`${p.nick} a intrat în faliment.`); }
}
function updateMeRef() { const mine = state.players.find(x => x.id === me.id); if (mine) me = mine; }

// ============= SYNC & PERSIST ============
async function commitState(extraLog = "") {
    if (extraLog) log(extraLog);
    channel.send({ type: "broadcast", event: "state", payload: state });
    await upsertState(); renderAll();
}
async function upsertState() { await supabase.from("games").upsert({ code: state.code, state }); }
