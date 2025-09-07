// ================== CONFIG SUPABASE ==================
const SUPABASE_URL = "https://ndxjdmkeounxliifpbyw.supabase.co";
const SUPABASE_ANON = "sb_publishable_7k4luMzyb2t3LNeHSF8WBQ_bLZB4KNc";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ================== UI HOOKS ==================
const $ = (s) => document.querySelector(s);
const lobby = $("#lobby");
const game = $("#game");
const codeLbl = $("#codeLbl");
const turnLbl = $("#turnLbl");
const presenceBox = $("#presence");
const playersList = $("#playersList");
const tilesEl = $("#tiles");
const logEl = $("#log");
const rollBtn = $("#rollBtn");
const buyBtn = $("#buyBtn");
const endBtn = $("#endBtn");
const youAre = $("#youAre");

$("#createBtn").onclick = createRoom;
$("#joinBtn").onclick = joinRoom;
rollBtn.onclick = rollDice;
buyBtn.onclick = buyProperty;
endBtn.onclick = endTurn;

// ================== GAME DATA (MVP) ==================
const START_MONEY = 1500;
const BOARD = makeBoard(); // 40 tile-uri simplificate

// ================== STATE ==================
let channel = null;
let roomCode = "";
let me = null; // {id, nick}
let state = null; // {code, players[], turnIdx, props{}, started, log[]}

// Un ID stabil pe device pentru prezență (salvat local)
const deviceId = getOrCreateDeviceId();

// ------------------ HELPERS ------------------
function randCode() {
    const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 4 }, () => a[Math.floor(Math.random() * a.length)]).join("");
}
function getOrCreateDeviceId() {
    const k = "monopoly_device_id";
    let v = localStorage.getItem(k);
    if (!v) { v = crypto.randomUUID(); localStorage.setItem(k, v); }
    return v;
}
function log(msg) {
    const time = new Date().toLocaleTimeString();
    state.log.push(`[${time}] ${msg}`);
    renderLog();
}
function renderLog() {
    logEl.innerHTML = state.log.slice(-200).map(l => `<div>${escapeHtml(l)}</div>`).join("");
    logEl.scrollTop = logEl.scrollHeight;
}
function escapeHtml(s) { return s.replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[m])); }

// ------------------ BOARD GEN ------------------
function makeBoard() {
    const props = (names, price, rent) => names.map(n => ({ type: "prop", name: n, price, rent }));
    return [
        { type: "go", name: "GO" },
        ...props(["Brown 1", "Brown 2"], 60, 8),
        { type: "tax", name: "Taxă", amount: 200 },
        ...props(["Light Blue 1", "Light Blue 2", "Light Blue 3"], 100, 10),
        { type: "jail", name: "Închisoare (Doar vizită)" },
        ...props(["Pink 1", "Pink 2", "Pink 3"], 140, 12),
        ...props(["Orange 1", "Orange 2", "Orange 3"], 180, 14),
        { type: "free", name: "Parcare liberă" },
        ...props(["Red 1", "Red 2", "Red 3"], 220, 18),
        ...props(["Yellow 1", "Yellow 2", "Yellow 3"], 260, 22),
        { type: "gojail", name: "Mergi la închisoare" },
        ...props(["Green 1", "Green 2", "Green 3"], 300, 26),
        ...props(["Dark Blue 1", "Dark Blue 2"], 400, 50),
    ].slice(0, 40);
}

// ------------------ RENDER BOARD ------------------
function renderBoard() {
    tilesEl.innerHTML = "";
    for (let i = 0; i < 40; i++) {
        const t = BOARD[i] || { type: "void", name: `${i}` };
        const li = document.createElement("li");
        const owners = document.createElement("div");
        owners.className = "owners";

        // pioni pe această poziție
        state.players.forEach(p => {
            if (p.bankrupt) return;
            if (p.pos === i) {
                const span = document.createElement("span");
                span.className = "pawn";
                span.textContent = p.pawn || "🔹";
                owners.appendChild(span);
            }
        });

        // badge proprietar
        if (t.type === "prop") {
            const ownerId = state.props[i] || null;
            const b = document.createElement("span");
            b.className = "badge";
            b.textContent = ownerId ? `Deținut` : `Liber`;
            owners.appendChild(b);
        }

        li.innerHTML = `
      <div class="tile-name">${i}. ${t.name || t.type.toUpperCase()}</div>
      <div class="tile-meta">
        ${t.type === "prop" ? `<span class="badge">💲${t.price} • Rent ${t.rent}</span>` : ""}
        ${t.type === "tax" ? `<span class="badge">Taxă ${t.amount}</span>` : ""}
        ${t.type === "go" ? `<span class="badge">+200 la trecere</span>` : ""}
        ${t.type === "gojail" ? `<span class="badge">Trimis la închisoare</span>` : ""}
      </div>
    `;
        li.appendChild(owners);
        tilesEl.appendChild(li);
    }
}

// ------------------ RENDER SIDE ------------------
function renderPlayers() {
    playersList.innerHTML = state.players.map((p, idx) => {
        const turn = idx === state.turnIdx ? " (tura)" : "";
        const dead = p.bankrupt ? "❌" : "";
        const cls = p.id === me.id ? "me" : "";
        return `<li class="${cls}"><span>${p.pawn || "🔹"} ${escapeHtml(p.nick)}${turn}</span><span>${dead} $${p.money}</span></li>`;
    }).join("");
    turnLbl.textContent = state.players[state.turnIdx]?.nick || "-";
    youAre.textContent = `Tu ești: ${me.pawn || "🔹"} ${me.nick}`;
}

function renderPresence(presence) {
    const list = Object.values(presence).flatMap(x => x).map(m => m.nick);
    presenceBox.textContent = `Online: ${list.join(", ")}`;
}

function renderAll() { renderBoard(); renderPlayers(); renderLog(); updateActionButtons(); }
function updateActionButtons() {
    const myTurn = state.players[state.turnIdx]?.id === me.id && !me.bankrupt;
    rollBtn.disabled = !myTurn;
}

// ------------------ ROOM FLOW ------------------
async function createRoom() {
    const nick = ($("#nick").value || "").trim() || "Guest";
    roomCode = ($("#roomCode").value || "").trim().toUpperCase() || randCode();
    me = { id: deviceId, nick, pawn: pickPawn() };

    state = {
        code: roomCode,
        players: [{ id: me.id, nick: me.nick, pawn: me.pawn, money: START_MONEY, pos: 0, bankrupt: false }],
        turnIdx: 0,
        props: {},
        started: false,
        log: []
    };

    await upsertState();
    await openChannel();
    enterGameUI();
    renderAll();
    log(`Camera ${roomCode} creată de ${me.nick}. Invită 1-3 prieteni.`);
}

async function joinRoom() {
    const nick = ($("#nick").value || "").trim() || "Guest";
    roomCode = ($("#roomCode").value || "").trim().toUpperCase();
    if (!roomCode) { alert("Introdu codul camerei"); return; }
    me = { id: deviceId, nick, pawn: pickPawn() };

    const { data, error } = await supabase.from("games").select("state").eq("code", roomCode).maybeSingle();
    if (error) { alert("Eroare la încărcarea camerei"); console.error(error); return; }
    if (!data) {
        state = { code: roomCode, players: [], turnIdx: 0, props: {}, started: false, log: [] };
        await upsertState();
    } else { state = data.state; }

    if (!state.players.find(p => p.id === me.id)) {
        if (state.players.length >= 4) { alert("Camera este plină (max 4)"); return; }
        state.players.push({ id: me.id, nick: me.nick, pawn: me.pawn, money: START_MONEY, pos: 0, bankrupt: false });
        await commitState(`S-a alăturat ${me.nick}`);
    }

    await openChannel();
    enterGameUI();
    renderAll();
}

async function openChannel() {
    if (channel) await channel.unsubscribe();

    channel = supabase.channel(`room:${roomCode}`, {
        config: { presence: { key: me.id } }
    });

    channel.on("presence", { event: "sync" }, () => {
        renderPresence(channel.presenceState());
    });

    channel.on("broadcast", { event: "state" }, ({ payload }) => {
        state = payload;
        renderAll();
    });

    await channel.subscribe((status) => { if (status === "SUBSCRIBED") channel.track({ id: me.id, nick: me.nick }); });
}

function enterGameUI() { lobby.classList.add("hidden"); game.classList.remove("hidden"); codeLbl.textContent = roomCode; }

// ------------------ GAMEPLAY ------------------
function currentPlayer() { return state.players[state.turnIdx]; }
function nextTurn() {
    let next = state.turnIdx;
    for (let i = 0; i < state.players.length; i++) {
        next = (next + 1) % state.players.length;
        if (!state.players[next].bankrupt) break;
    }
    state.turnIdx = next;
}
function pickPawn() { const pawns = ["🔹", "🔸", "🟩", "🟪", "⭐", "🔺", "🔻", "⚪"]; return pawns[Math.floor(Math.random() * pawns.length)]; }

async function rollDice() {
    const meTurn = currentPlayer().id === me.id && !me.bankrupt;
    if (!meTurn) return;
    const d1 = 1 + Math.floor(Math.random() * 6);
    const d2 = 1 + Math.floor(Math.random() * 6);
    const steps = d1 + d2;

    const p = currentPlayer();
    const before = p.pos;
    p.pos = (p.pos + steps) % 40;
    if (p.pos < before) { p.money += 200; log(`${p.nick} trece pe GO și primește $200`); }
    log(`${p.nick} a dat ${d1} + ${d2} = ${steps} și a ajuns pe ${p.pos}.`);

    await applyTile(p);
    updateMeRef();
    await commitState();
}

async function applyTile(p) {
    const t = BOARD[p.pos]; if (!t) return;
    if (t.type === "tax") { p.money -= t.amount; log(`${p.nick} plătește taxă $${t.amount}.`); checkBankrupt(p); endBtn.classList.remove("hidden"); }
    else if (t.type === "gojail") { p.pos = 10; log(`${p.nick} merge direct la închisoare.`); endBtn.classList.remove("hidden"); }
    else if (t.type === "prop") {
        const ownerId = state.props[p.pos] || null;
        if (!ownerId) { buyBtn.classList.remove("hidden"); endBtn.classList.remove("hidden"); buyBtn.dataset.tile = String(p.pos); }
        else if (ownerId !== p.id) {
            const owner = state.players.find(x => x.id === ownerId);
            if (owner && !owner.bankrupt) { p.money -= t.rent; owner.money += t.rent; log(`${p.nick} plătește chirie $${t.rent} către ${owner.nick}.`); checkBankrupt(p); }
            endBtn.classList.remove("hidden");
        } else { endBtn.classList.remove("hidden"); }
    } else { endBtn.classList.remove("hidden"); }
}

async function buyProperty() {
    const myTurn = currentPlayer().id === me.id && !me.bankrupt; if (!myTurn) return;
    const idx = Number(buyBtn.dataset.tile || "-1"); if (idx < 0) return;
    const t = BOARD[idx]; if (t?.type !== "prop") return;
    const ownerId = state.props[idx] || null; if (ownerId) { buyBtn.classList.add("hidden"); return; }
    const p = currentPlayer(); if (p.money < t.price) { log(`${p.nick} nu are bani suficienți pentru ${t.name}.`); buyBtn.classList.add("hidden"); return; }
    p.money -= t.price; state.props[idx] = p.id; log(`${p.nick} cumpără ${t.name} pentru $${t.price}.`);
    buyBtn.classList.add("hidden"); updateMeRef(); await commitState();
}

async function endTurn() {
    const myTurn = currentPlayer().id === me.id && !me.bankrupt; if (!myTurn) return;
    buyBtn.classList.add("hidden"); endBtn.classList.add("hidden"); nextTurn(); await commitState(`${currentPlayer().nick} este la mutare.`);
}

function checkBankrupt(p) {
    if (p.money < 0) {
        p.bankrupt = true;
        for (const [k, v] of Object.entries(state.props)) { if (v === p.id) delete state.props[k]; }
        log(`${p.nick} a intrat în faliment.`);
    }
}
function updateMeRef() { const mine = state.players.find(x => x.id === me.id); if (mine) me = mine; }

// ------------------ SYNC & PERSIST ------------------
async function commitState(extraLog = "") {
    if (extraLog) log(extraLog);
    channel.send({ type: "broadcast", event: "state", payload: state });
    await upsertState();
    renderAll();
}
async function upsertState() { await supabase.from("games").upsert({ code: state.code, state }); }
