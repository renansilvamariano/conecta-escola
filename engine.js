// Regras do sistema: estoque compartilhado por tipo, data e aula.
window.Engine = (() => {
  const KEY = "recursos_escolares_2026";
  let db;
  try {
    db = JSON.parse(localStorage.getItem(KEY)) || structuredClone(INITIAL_DATA);
  } catch (e) {
    db = JSON.parse(JSON.stringify(INITIAL_DATA));
  }
  db.inventory = db.inventory || { Chromebook: 40, Tablet: 30 };
  db.slots = db.slots || JSON.parse(JSON.stringify(INITIAL_DATA.slots));
  db.resources = db.resources || [];
  db.reservations = db.reservations || [];

  const save = () => localStorage.setItem(KEY, JSON.stringify(db));
  const makeId = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);

  // Migra o estoque agregado para uma lista individual de unidades.
  // Os dois registros antigos de resumo não representam equipamentos individuais.
  db.resources = db.resources.filter(r =>
    !(r.category === "Chromebook" && String(r.code || "").toLowerCase() === "40 unidades") &&
    !(r.category === "Tablet" && String(r.code || "").toLowerCase() === "30 unidades")
  );

  function ensureInventoryEntries() {
    for (const type of ["Chromebook", "Tablet"]) {
      const prefix = type === "Chromebook" ? "CH" : "TB";
      const current = db.resources.filter(r => r.category === type);
      const target = Math.max(0, Number(db.inventory[type] || 0));
      const usedCodes = new Set(current.map(r => String(r.code || "").trim().toUpperCase()));
      let sequence = 1;
      while (current.length < target) {
        const code = `${prefix}-${String(sequence).padStart(3, "0")}`;
        sequence++;
        if (usedCodes.has(code.toUpperCase())) continue;
        current.push({
          id: makeId(),
          category: type,
          code,
          description: "Identificação provisória — atualizar com o patrimônio, se necessário.",
          generated: true
        });
        usedCodes.add(code.toUpperCase());
      }
      db.resources = db.resources.filter(r => r.category !== type).concat(current);
    }
  }
  ensureInventoryEntries();
  save();

  const all = () => {
    refreshReservationStatuses();
    return JSON.parse(JSON.stringify(db));
  };
  function localDateTime(date, time) {
    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);
    return new Date(year, month - 1, day, hour, minute, 0, 0);
  }
  function slotTimes(slot) {
    const times = String(slot.time || "").split(/[–-]/).map(x => x.trim());
    return { start: times[0] || slot.start, end: times[1] || slot.start };
  }
  function currentStatus(reservation, now = new Date()) {
    if (reservation.status === "Cancelado") return "Cancelado";
    const slot = db.slots.find(s => s.id === reservation.slotId);
    if (!slot || !reservation.date) return reservation.status || "Agendado";
    const times = slotTimes(slot);
    const start = localDateTime(reservation.date, times.start);
    const end = localDateTime(reservation.date, times.end);
    if (now >= end) return "Concluído";
    if (now >= start) return "Em utilização";
    return "Agendado";
  }
  function refreshReservationStatuses() {
    let changed = false;
    const now = new Date();
    db.reservations.forEach(r => {
      const next = currentStatus(r, now);
      if (r.status !== next) { r.status = next; changed = true; }
    });
    if (changed) save();
  }
  function reserved(type, date, slotId, ignoreId = null) {
    refreshReservationStatuses();
    return db.reservations
      .filter(r => r.id !== ignoreId &&
        ["Agendado", "Em utilização"].includes(r.status) &&
        r.date === date && r.slotId === slotId && r.equipmentType === type)
      .reduce((sum, r) => sum + Number(r.quantity || 0), 0);
  }
  function availability(type, date, slotId) {
    const total = Number(db.inventory[type] || 0);
    const used = reserved(type, date, slotId);
    return { total, reserved: used, available: Math.max(0, total - used) };
  }
  function addResource(x) {
    const category = String(x.category || "");
    if (!["Chromebook", "Tablet"].includes(category)) {
      throw Error("Selecione Chromebook ou Tablet.");
    }
    const code = String(x.code || "").trim();
    if (!code) throw Error("Informe a identificação ou o número do patrimônio.");
    db.resources.push({
      id: makeId(),
      category,
      code,
      description: String(x.description || "").trim()
    });
    db.inventory[category] = Number(db.inventory[category] || 0) + 1;
    save();
  }
  function addReservation(x) {
    refreshReservationStatuses();
    const slot = db.slots.find(s => s.id === x.slotId);
    if (!slot) throw Error("Selecione um horário livre da grade.");
    const type = x.equipmentType;
    if (!["Chromebook", "Tablet"].includes(type)) throw Error("Selecione Chromebook ou Tablet.");
    const quantity = Number(x.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) throw Error("Informe uma quantidade válida.");
    const { start, end } = slotTimes(slot);
    if (new Date() >= localDateTime(x.date, end)) throw Error("Esse horário já terminou. Escolha uma data futura.");
    const stock = availability(type, x.date, x.slotId);
    if (quantity > stock.available) throw Error(`Quantidade indisponível. Restam apenas ${stock.available} ${type === "Chromebook" ? "Chromebooks" : "tablets"} neste horário.`);
    db.reservations.push({
      ...x, equipmentType:type, quantity, day:slot.day, lesson:slot.lesson,
      time:slot.time, id:makeId(), status:"Agendado"
    });
    save();
  }
  function status(id, s) { const r=db.resources.find(x=>x.id===id); if(r){r.status=s;save();} }
  function reservationStatus(id, s) {
    const r=db.reservations.find(x=>x.id===id);
    if(r && s === "Cancelado" && ["Agendado", "Em utilização"].includes(currentStatus(r))) {
      r.status = "Cancelado"; save();
    }
  }
  function remove(id) {
    refreshReservationStatuses();
    const resource = db.resources.find(x => x.id === id);
    if (!resource) throw Error("Equipamento não encontrado.");
    if (db.reservations.some(x=>x.resourceId===id&&["Agendado","Em utilização"].includes(x.status))) {
      throw Error("Há reserva ativa para este equipamento.");
    }
    db.resources = db.resources.filter(x => x.id !== id);
    if (["Chromebook", "Tablet"].includes(resource.category)) {
      db.inventory[resource.category] = Math.max(0, Number(db.inventory[resource.category] || 0) - 1);
    }
    save();
  }
  return { all, addResource, addReservation, status, reservationStatus, remove, availability };
})();
