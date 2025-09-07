// ============= SUPABASE =============
const SUPABASE_URL = "https://ndxjdmkeounxliifpbyw.supabase.co";
const SUPABASE_ANON = "sb_publishable_7k4luMzyb2t3LNeHSF8WBQ_bLZB4KNc";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ============= UI HOOKS ============
const $ = (s) => document.querySelector(s);
const lobby = $("#lobby");
const game = $("#game");
const modeLbl = $("#modeLbl");
const codeLbl = $("#codeLbl");
const turnLbl = $("#turnLbl");
const presenceBox = $("#presence");
const playersList = $("#playersList");
const logEl = $("#log");
const rollBtn = $("#rollBtn");
const buyBtn = $("#buyBtn");
const endBtn = $("#endBtn");
const youAre = $("#youAre");
const localModeChk = $("#localMode");
const localSetup = $("#localSetup");
const localPlayersDiv = $("#localPlayers");
const addLocalBtn = $("#addLocal");
const startLocalBtn = $("#startLocalBtn");
const diceLayer = $("#diceLayer");
const d1El = $("#d1"), d2El = $("#d2");

// board container
const boardHost = document.createElement("div");
boardHost.className = "board-inner";
document.querySelector(".board").appendChild(boardHost);

// lobby actions
$("#createBtn").onclick = createRoom;
$("#joinBtn").onclick = joinRoom;
rollBtn.onclick = rollDice;
buyBtn.onclick = buyProperty;
endBtn.onclick = endTurn;

// local mode UI
localModeChk.onchange = () => {
    localSetup.style.display = localModeChk.checked ? "block" : "none";
    if (localModeChk.checked && localPlayersDiv.childElementCount === 0) seedLocalPlayers();
};
addLocalBtn.onclick = () => addLocalRow();
startLocalBtn.onclick = () => startLocalGame();

// ============= GAME DATA ============
const START_MONEY = 1500;
const PLAYER_COLORS = ["#ff4d4f", "#a855f7", "#22c55e", "#3b82f6", "#f59e0b", "#f97316", "#e5e7eb", "#8b5e3c"];
const DENOMS = [500, 100, 50, 20, 10, 5, 1];

// board definition (GO -> CCW)
const BOARD = [
    { t: "go", name: "GO" },
    { t: "prop", name: "Mediterranean Avenue", price: 60, rent: 8, color: "brown" },
    { t: "chest", name: "Community Chest" },
    { t: "prop", name: "Baltic Avenue", price: 60, rent: 8, color: "brown" },
    { t: "tax", name: "Income Tax", amount: 200 },
    { t: "rail", name: "Reading Railroad", price: 200, rent: 25, color: "black" },
    { t: "prop", name: "Oriental Avenue", price: 100, rent: 10, color: "lblue" },
    { t: "chance", name: "Chance" },
    { t: "prop", name: "Vermont Avenue", price: 100, rent: 10, color: "lblue" },
    { t: "prop", name: "Connecticut Avenue", price: 120, rent: 12, color: "lblue" },
    { t: "jail", name: "Jail / Just Visiting" },
    { t: "prop", name: "St. Charles Place", price: 140, rent: 12, color: "pink" },
    { t: "util", name: "Electric Company", price: 150, rent: 12, color: "black" },
    { t: "prop", name: "States Avenue", price: 140, rent: 12, color: "pink" },
    { t: "prop", name: "Virginia Avenue", price: 160, rent: 14, color: "pink" },
    { t: "rail", name: "Pennsylvania Railroad", price: 200, rent: 25, color: "black" },
    { t: "prop", name: "St. James Place", price: 180, rent: 14, color: "orange" },
    { t: "chest", name: "Community Chest" },
    { t: "prop", name: "Tennessee Avenue", price: 180, rent: 14, color: "orange" },
    { t: "prop", name: "New York Avenue", price: 200, rent: 16, color: "orange" },
    { t: "free", name: "Free Parking" },
    { t: "prop", name: "Kentucky Avenue", price: 220, rent: 18, color: "red" },
    { t: "chance", name: "Chance" },
    { t: "prop", name: "Indiana Avenue", price: 220, rent: 18, color: "red" },
    { t: "prop", name: "Illinois Avenue", price: 240, rent: 20, color: "red" },
    { t: "rail", name: "B. & O. Railroad", price: 200, rent: 25, color: "black" },
    { t: "prop", name: "Atlantic Avenue", price: 260, rent: 22, color: "yellow" },
    { t: "prop", name: "Ventnor Avenue", price: 260, rent: 22, color: "yellow" },
    { t: "util", name: "Water Works", price: 150, rent: 12, color: "black" },
    { t: "prop", name: "Marvin Gardens", price: 280, rent: 24, color: "yellow" },
    { t: "gojail", name: "Go to Jail" },
    { t: "prop", name: "Pacific Avenue", price: 300, rent: 26, color: "green" },
    { t: "prop", name: "North Carolina Avenue", price: 300, rent: 26, color: "green" },
    { t: "chest", name: "Community Chest" },
    { t: "prop", name: "Pennsylvania Avenue", price: 320, rent: 28, color: "green" },
    { t: "rail", name: "Short Line", price: 200, rent: 25, color: "black" },
    { t: "chance", name: "Chance" },
    { t: "prop", name: "Park Place", price: 350, rent: 35, color: "dblue" },
    { t: "tax", name: "Luxury Tax", amount: 100 },
    { t: "prop", name: "Boardwalk", price: 400, rent: 50, color: "dblue" },
];

/* Rente standard Monopoly pentru proprietăți color
   rents: [fără case, 1 casă, 2 case, 3 case, 4 case, hotel]
   houseCost: cost pe casă în grup */
const DEEDS = {
    1: { houseCost: 50, rents: [2, 10, 30, 90, 160, 250] },
    3: { houseCost: 50, rents: [4, 20, 60, 180, 320, 450] },
    6: { houseCost: 50, rents: [6, 30, 90, 270, 400, 550] },
    8: { houseCost: 50, rents: [6, 30, 90, 270, 400, 550] },
    9: { houseCost: 50, rents: [8, 40, 100, 300, 450, 600] },
    11: { houseCost: 100, rents: [10, 50, 150, 450, 625, 750] },
    13: { houseCost: 100, rents: [10, 50, 150, 450, 625, 750] },
    14: { houseCost: 100, rents: [12, 60, 180, 500, 700, 900] },
    16: { houseCost: 100, rents: [14, 70, 200, 550, 750, 950] },
    18: { houseCost: 100, rents: [14, 70, 200, 550, 750, 950] },
    19: { houseCost: 100, rents: [16, 80, 220, 600, 800, 1000] },
    21: { houseCost: 150, rents: [18, 90, 250, 700, 875, 1050] },
    23: { houseCost: 150, rents: [18, 90, 250, 700, 875, 1050] },
    24: { houseCost: 150, rents: [20, 100, 300, 750, 925, 1100] },
    26: { houseCost: 150, rents: [22, 110, 330, 800, 975, 1150] },
    27: { houseCost: 150, rents: [22, 110, 330, 800, 975, 1150] },
    29: { houseCost: 150, rents: [24, 120, 360, 850, 1025, 1200] },
    31: { houseCost: 200, rents: [26, 130, 390, 900, 1100, 1275] },
    32: { houseCost: 200, rents: [26, 130, 390, 900, 1100, 1275] },
    34: { houseCost: 200, rents: [28, 150, 450, 1000, 1200, 1400] },
    37: { houseCost: 200, rents: [35, 175, 500, 1100, 1300, 1500] },
    39: { houseCost: 200, rents: [50, 200, 600, 1400, 1700, 2000] },
};

// ============= STATE =============
let channel = null;
let roomCode = "";
let me = null;
let state = null; // {code, players[], turnIdx, props{}, started, log[]}
let isLocal = false;
let selectedIdx = null;
let turnAutoTimer = null;
let syncInterval = null; // fallback polling
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
function ensurePlayerColors() { state.players.forEach((p, i) => { if (!p.color) p.color = PLAYER_COLORS[i % PLAYER_COLORS.length]; }); }

// nume scurte pe tablă („Park P.”, „North C. Ave”, „Reading Rail”)
function displayNameShort(name) {
    if (!name) return "";
    let n = name
        .replace(/Avenue/gi, "Ave")
        .replace(/Railroad/gi, "Rail")
        .replace(/Company/gi, "Co.")
        .replace(/Water Works/gi, "Water")
        .replace(/Electric Company/gi, "Electric")
        .replace(/Jail \/ Just Visiting/i, "Jail")
        .replace(/Community Chest/i, "Chest")
        .replace(/Free Parking/i, "Free")
        .replace(/Short Line/i, "Short Ln");

    const SUF = new Set(["Ave", "Pl", "Rail", "Co.", "Water", "Electric", "Ln", "Short", "Short Ln"]);
    let parts = n.split(/\s+/).filter(Boolean);
    let suffix = "";
    if (parts.length >= 2 && SUF.has(parts[parts.length - 1])) {
        suffix = " " + parts.pop();
    }
    let first = parts[0] || "";
    let second = parts[1] ? parts[1][0] + "." : "";

    if (/^[A-Z]\.$/.test(first) || first.endsWith(".")) {
        if (parts[1]) second = parts[1]; // ex: „B. &”
    }
    return (first + (second ? " " + second : "") + suffix).slice(0, 18);
}

// cash helpers
function moneyBreakdown(amount) { const out = []; let left = Math.max(0, Math.floor(amount || 0)); for (const d of DENOMS) { const n = Math.floor(left / d); if (n > 0) { out.push([d, n]); left -= n * d; } } return out; }
function billsHTML(amount) { const br = moneyBreakdown(amount); if (!br.length) return '<div class="muted">—</div>'; return `<div class="cash">${br.map(([d, n]) => `<div class="bill b${d}"><span class="val">${d}</span><span class="cnt">×${n}</span></div>`).join("")}</div>`; }

// dice overlay
function showDice(d1, d2) {
    d1El.textContent = d1; d2El.textContent = d2;
    diceLayer.classList.remove("hidden");
    d1El.style.animation = "none"; d2El.style.animation = "none";
    void d1El.offsetWidth; void d2El.offsetWidth;
    d1El.style.animation = ""; d2El.style.animation = "";
    setTimeout(() => diceLayer.classList.add("hidden"), 1200);
}

// fallback polling (în caz că Realtime e throttled în in-app browsers)
function startFallbackSync() {
    clearInterval(syncInterval);
    if (!roomCode) return;
    syncInterval = setInterval(async () => {
        try {
            const { data } = await supabase.from("games").select("state").eq("code", roomCode).maybeSingle();
            if (data && data.state) {
                const serverState = data.state;
                const localSig = JSON.stringify({ t: state.turnIdx, p: state.players?.length, r: Object.keys(state.props || {}).length });
                const remoteSig = JSON.stringify({ t: serverState.turnIdx, p: serverState.players?.length, r: Object.keys(serverState.props || {}).length });
                if (localSig !== remoteSig) { state = serverState; renderAll(); }
            }
        } catch (e) { }
    }, 2500);
}

// ============= LAYOUT ============
function layoutForIndex(i) {
    if (i === 0) return { row: 11, col: 11, side: "bottom", corner: true };
    if (i <= 9) return { row: 11, col: 11 - i, side: "bottom" };
    if (i === 10) return { row: 11, col: 1, side: "left", corner: true };
    if (i <= 19) return { row: 11 - (i - 10), col: 1, side: "left" };
    if (i === 20) return { row: 1, col: 1, side: "top", corner: true };
    if (i <= 29) return { row: 1, col: (i - 20) + 1, side: "top" };
    if (i === 30) return { row: 1, col: 11, side: "right", corner: true };
    return { row: (i - 30) + 1, col: 11, side: "right" };
}

// ============= RENDER ============
function renderBoard() {
    boardHost.innerHTML = "";
    for (let i = 0; i < 40; i++) {
        const t = BOARD[i];
        const pos = layoutForIndex(i);
        const el = document.createElement("div");
        el.className = `tile side-${pos.side} ${pos.corner ? "corner" : ""} ${t.t === "prop" ? "prop" : ""} ${selectedIdx === i ? "selected" : ""}`;
        el.style.gridRow = pos.row;
        el.style.gridColumn = pos.col;

        if (t.t === "prop") {
            const band = document.createElement("div");
            band.className = `band ${t.color || ""}`;
            el.appendChild(band);
        }

        const owners = document.createElement("div");
        owners.className = "owners";
        state?.players?.forEach(p => {
            if (p.bankrupt) return;
            if (p.pos === i) { const s = document.createElement("span"); s.className = "pawn"; s.textContent = p.pawn || "🔹"; owners.appendChild(s); }
        });

        const ownerId = state?.props?.[i] || null;
        if (["prop", "rail", "util"].includes(t.t)) {
            const badge = document.createElement("div");
            badge.className = "badge";
            badge.style.position = "absolute";
            badge.style.left = "4px"; badge.style.bottom = "4px";
            badge.textContent = ownerId ? "Deținut" : "Liber";
            el.appendChild(badge);

            if (ownerId) {
                const owner = state.players.find(x => x.id === ownerId);
                if (owner) {
                    const fill = document.createElement("div"); fill.className = "owner-fill"; fill.style.background = owner.color;
                    const ring = document.createElement("div"); ring.className = "owner-ring"; ring.style.boxShadow = `inset 0 0 0 3px ${owner.color}aa`;
                    el.appendChild(fill); el.appendChild(ring);
                }
            }
        }

        const content = document.createElement("div");
        content.className = "content";
        content.innerHTML = `
      <div class="name">${i}. ${escapeHtml(displayNameShort(t.name))}</div>
      ${t.t === "prop" ? `<div class="price">$${t.price} • Rent ${t.rent}</div>` : ""}
      ${t.t === "tax" ? `<div class="price">Taxă $${t.amount}</div>` : ""}
      ${t.t === "go" ? `<div class="price">+200 la trecere</div>` : ""}
      ${t.t === "gojail" ? `<div class="price">Trimis la închisoare</div>` : ""}
    `;
        el.appendChild(content);
        el.appendChild(owners);
        el.onclick = () => { selectedIdx = i; renderInspector(); renderBoard(); };
        boardHost.appendChild(el);
    }
}

function renderPlayers() {
    if (!state) return;
    playersList.innerHTML = state.players.map((p, idx) => {
        const turn = idx === state.turnIdx ? " (tura)" : "";
        const dead = p.bankrupt ? "❌" : "";
        const meCls = (isLocal ? idx === state.turnIdx : (p.id === me?.id)) ? "me" : "";
        return `
      <li class="${meCls}">
        <div><span class="dot" style="background:${p.color}"></span> ${escapeHtml(p.nick)}${turn}</div>
        <div>${dead} $${p.money}</div>
        <div class="cashline">Cash: $${p.money}</div>
      </li>`;
    }).join("");
    turnLbl.textContent = state.players[state.turnIdx]?.nick || "-";
    youAre.textContent = isLocal ? `Mod local (hot-seat).` : `Tu ești: ${me?.nick || ""}`;
}

function renderInspector() {
    const box = $("#inspector");
    if (selectedIdx == null) { box.innerHTML = "Selectează o căsuță…"; return; }
    const t = BOARD[selectedIdx];
    const ownerId = state.props[selectedIdx] || null;
    const owner = ownerId ? state.players.find(p => p.id === ownerId) : null;

    const deed = DEEDS[selectedIdx];
    let detailsHTML = "";
    if (t.t === "prop" && deed) {
        const [base, h1, h2, h3, h4, hot] = deed.rents;
        detailsHTML = `
      <div style="margin-top:6px;border:1px dashed #223549;border-radius:8px;padding:8px">
        <div style="font-weight:700;margin-bottom:6px">Card proprietate</div>
        <div style="display:grid;grid-template-columns:1fr auto;gap:4px;font-size:.95rem">
          <div>Chirie (fără case)</div> <div>$${base}</div>
          <div>Cu 1 casă</div>          <div>$${h1}</div>
          <div>Cu 2 case</div>          <div>$${h2}</div>
          <div>Cu 3 case</div>          <div>$${h3}</div>
          <div>Cu 4 case</div>          <div>$${h4}</div>
          <div>Cu hotel</div>           <div>$${hot}</div>
        </div>
        <div class="muted" style="margin-top:6px">
          Cost pe casă: $${deed.houseCost} · Hotel = 4 case + $${deed.houseCost}
        </div>
      </div>
    `;
    }

    box.innerHTML = `
    <div class="title">${selectedIdx}. ${escapeHtml(t.name)}</div>
    <div class="meta">
      ${t.t === "prop" ? `Preț: $${t.price}` : ""}
      ${t.t === "rail" ? `Preț: $${t.price} · Chirie: $${t.rent}` : ""}
      ${t.t === "util" ? `Preț: $${t.price} · Chirie: $${t.rent}` : ""}
      ${t.t === "tax" ? `Taxă: $${t.amount}` : ""}
      ${t.t === "go" ? `La trecere: +$200` : ""}
      ${owner ? `<br><b style="color:${owner.color}">Deținut de: ${escapeHtml(owner.nick)}</b>` : "<br>Proprietate liberă"}
    </div>
    ${detailsHTML}
  `;
}

function renderPortfolio() {
    const wrap = $("#portfolio");
    const entries = Object.entries(state.props);
    const byOwner = new Map();
    entries.forEach(([idx, ownerId]) => {
        if (!byOwner.has(ownerId)) byOwner.set(ownerId, []);
        byOwner.get(ownerId).push(+idx);
    });

    const groupOrder = { brown: 1, lblue: 2, pink: 3, orange: 4, red: 5, yellow: 6, green: 7, dblue: 8, black: 9 };
    const sortProps = (arr) => arr.sort((a, b) => {
        const ga = groupOrder[BOARD[a].color || "black"] || 99;
        const gb = groupOrder[BOARD[b].color || "black"] || 99;
        return ga === gb ? a - b : ga - gb;
    });

    wrap.innerHTML = state.players.map(p => {
        const list = sortProps(byOwner.get(p.id) || []);
        const deeds = list.length
            ? `<div class="deeds">${list.map(idx => {
                const b = BOARD[idx];
                return `<div class="deed" data-idx="${idx}">
                    <div class="deed-head ${b.color || "black"}">${idx}. ${escapeHtml(b.name)}</div>
                    <div class="deed-body">
                      <div class="deed-row"><span>Preț</span><span>$${b.price ?? "-"}</span></div>
                      <div class="deed-row"><span>Chirie</span><span>$${b.rent ?? "-"}</span></div>
                      <small class="muted">Grup: ${b.color || "—"}</small>
                    </div>
                  </div>`;
            }).join("")}</div>`
            : `<div class="muted">— fără proprietăți —</div>`;

        return `
      <div class="pf">
        <div class="pf-h"><span class="dot" style="background:${p.color}"></span> ${escapeHtml(p.nick)}</div>
        <div class="muted" style="margin-bottom:4px">Cash: $${p.money}</div>
        ${billsHTML(p.money)}
        ${deeds}
      </div>
    `;
    }).join("");

    wrap.querySelectorAll(".deed").forEach(card => {
        card.onclick = () => { selectedIdx = Number(card.dataset.idx); renderInspector(); renderBoard(); };
    });
}

function renderLog() { logEl.innerHTML = state.log.slice(-200).map(l => `<div>${l}</div>`).join(""); logEl.scrollTop = logEl.scrollHeight; }
function renderAll() { ensurePlayerColors(); renderBoard(); renderPlayers(); renderInspector(); renderPortfolio(); renderLog(); updateActionButtons(); }
function updateActionButtons() {
    if (isLocal) { rollBtn.disabled = false; return; }
    const myTurn = state.players[state.turnIdx]?.id === me?.id && !me?.bankrupt;
    rollBtn.disabled = !myTurn;
}

// ============= ONLINE FLOW ============
async function createRoom() {
    isLocal = false;
    const nick = ($("#nick").value || "").trim() || "Guest";
    roomCode = ($("#roomCode").value || "").trim().toUpperCase() || randCode();
    me = { id: deviceId, nick, pawn: pickPawn(), color: PLAYER_COLORS[0] };

    state = {
        code: roomCode,
        players: [{ id: me.id, nick: me.nick, pawn: me.pawn, color: me.color, money: START_MONEY, pos: 0, bankrupt: false }],
        turnIdx: 0, props: {}, started: false, log: []
    };
    await upsertState();
    await openChannel();
    startFallbackSync();
    enterGameUI(); renderAll();
    log(`Camera ${roomCode} creată de ${me.nick}. Invită 1–3 prieteni.`);
}
async function joinRoom() {
    isLocal = false;
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
        const color = PLAYER_COLORS[state.players.length % PLAYER_COLORS.length];
        state.players.push({ id: me.id, nick: me.nick, pawn: me.pawn, color, money: START_MONEY, pos: 0, bankrupt: false });
        await commitState(`S-a alăturat ${me.nick}`);
    }
    await openChannel();
    startFallbackSync();
    enterGameUI(); renderAll();
}
async function openChannel() {
    if (channel) await channel.unsubscribe();
    presenceBox.textContent = "";

    channel = supabase.channel(`room:${roomCode}`, { config: { presence: { key: me.id } } });

    channel.on("presence", { event: "sync" }, () => {
        const names = Object.values(channel.presenceState()).flatMap(x => x).map(m => m.nick);
        presenceBox.textContent = names.length ? ("Online: " + names.join(", ")) : "";
    });

    channel.on("broadcast", { event: "state" }, ({ payload }) => { state = payload; renderAll(); });
    channel.on("broadcast", { event: "dice" }, ({ payload }) => { showDice(payload.d1, payload.d2); });

    await channel.subscribe((st) => { if (st === "SUBSCRIBED") channel.track({ id: me.id, nick: me.nick }); });
}
function enterGameUI() {
    lobby.classList.add("hidden"); game.classList.remove("hidden");
    modeLbl.textContent = isLocal ? "Mod local:" : "Cameră:";
    codeLbl.textContent = isLocal ? "Același dispozitiv" : roomCode;
}

// ============= LOCAL (hot-seat) ============
function seedLocalPlayers() { localPlayersDiv.innerHTML = ""; addLocalRow("Razvan"); addLocalRow("Oaspete"); }
function addLocalRow(val = "") {
    const n = localPlayersDiv.childElementCount + 1;
    const wrap = document.createElement("div");
    wrap.className = "row";
    wrap.innerHTML = `
    <label>Jucător ${n}</label>
    <input class="lp" placeholder="nume" value="${val}" maxlength="16"/>
    <button class="secondary rm">Șterge</button>
  `;
    wrap.querySelector(".rm").onclick = () => wrap.remove();
    localPlayersDiv.appendChild(wrap);
}
function startLocalGame() {
    const names = [...localPlayersDiv.querySelectorAll(".lp")].map(i => i.value.trim()).filter(Boolean);
    if (names.length < 2) { alert("Minim 2 jucători."); return; }
    isLocal = true; roomCode = "LOCAL"; me = null;
    state = {
        code: roomCode,
        players: names.slice(0, 6).map((nick, idx) => ({
            id: crypto.randomUUID(), local: true, nick, pawn: pickPawn(), color: PLAYER_COLORS[idx % PLAYER_COLORS.length],
            money: START_MONEY, pos: 0, bankrupt: false
        })),
        turnIdx: 0, props: {}, started: true, log: []
    };
    channel = null; enterGameUI(); renderAll();
    log(`Joc local pornit pentru ${state.players.length} jucători: ${names.join(", ")}.`);
}

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
    if (!isLocal) {
        const myTurn = state.players[state.turnIdx]?.id === me?.id && !me?.bankrupt;
        if (!myTurn) return;
    }

    const d1 = 1 + Math.floor(Math.random() * 6), d2 = 1 + Math.floor(Math.random() * 6), steps = d1 + d2;
    showDice(d1, d2);
    if (!isLocal && channel) channel.send({ type: "broadcast", event: "dice", payload: { d1, d2 } });

    const p = currentPlayer(); const before = p.pos;
    p.pos = (p.pos + steps) % 40;
    if (p.pos < before) { p.money += 200; log(`${p.nick} trece pe GO și primește $200`); }
    log(`${p.nick} a dat ${d1} + ${d2} = ${steps} și a ajuns pe ${p.pos}.`);

    await applyTile(p);
    updateMeRef();
    await commitState();
}

async function applyTile(p) {
    clearTimeout(turnAutoTimer);
    let actionPending = false;
    const t = BOARD[p.pos]; if (!t) return;

    if (t.t === "tax") { p.money -= t.amount; log(`${p.nick} plătește taxă $${t.amount}.`); checkBankrupt(p); }
    else if (t.t === "gojail") { p.pos = 10; log(`${p.nick} merge direct la închisoare.`); }
    else if (["prop", "rail", "util"].includes(t.t)) {
        const idx = p.pos;
        const ownerId = state.props[idx] || null;
        if (!ownerId) {
            buyBtn.classList.remove("hidden");
            buyBtn.dataset.tile = String(idx);
            actionPending = true;
        } else if (ownerId !== p.id) {
            const owner = state.players.find(x => x.id === ownerId);
            const rent = t.rent ?? 10;
            if (owner && !owner.bankrupt) { p.money -= rent; owner.money += rent; log(`${p.nick} plătește chirie $${rent} către ${owner.nick}.`); checkBankrupt(p); }
        }
    }

    endBtn.classList.remove("hidden");
    buyBtn.classList.toggle("hidden", !actionPending);

    if (!actionPending) {
        turnAutoTimer = setTimeout(async () => { await endTurn(true); }, 1300);
    }
}

async function buyProperty() {
    if (!isLocal) {
        const myTurn = currentPlayer().id === me?.id && !me?.bankrupt; if (!myTurn) return;
    }
    const idx = Number(buyBtn.dataset.tile || "-1"); if (idx < 0) return;
    const t = BOARD[idx]; if (!["prop", "rail", "util"].includes(t.t)) return;
    const ownerId = state.props[idx] || null; if (ownerId) { buyBtn.classList.add("hidden"); return; }
    const p = currentPlayer(); const price = t.price ?? 100;
    if (p.money < price) { log(`${p.nick} nu are bani suficienți pentru ${t.name}.`); buyBtn.classList.add("hidden"); return; }
    p.money -= price; state.props[idx] = p.id; log(`${p.nick} cumpără ${t.name} pentru $${price}.`);
    buyBtn.classList.add("hidden"); updateMeRef(); await commitState();
}

async function endTurn(auto = false) {
    if (!isLocal && !auto) {
        const myTurn = currentPlayer().id === me?.id && !me?.bankrupt; if (!myTurn) return;
    }
    clearTimeout(turnAutoTimer);
    buyBtn.classList.add("hidden"); endBtn.classList.add("hidden");
    nextTurn(); await commitState(`${currentPlayer().nick} este la mutare.`);
}

function checkBankrupt(p) {
    if (p.money < 0) {
        p.bankrupt = true;
        for (const [k, v] of Object.entries(state.props)) { if (v === p.id) delete state.props[k]; }
        log(`${p.nick} a intrat în faliment.`);
    }
}
function updateMeRef() { if (!isLocal) { const mine = state.players.find(x => x.id === me?.id); if (mine) me = mine; } }

// ============= SYNC & PERSIST ============
async function commitState(extraLog = "") {
    if (extraLog) log(extraLog);
    if (isLocal) { localStorage.setItem("monopoly_local_state", JSON.stringify(state)); renderAll(); return; }
    channel?.send({ type: "broadcast", event: "state", payload: state });
    await upsertState(); renderAll();
}
async function upsertState() { return supabase.from("games").upsert({ code: state.code, state }); }
