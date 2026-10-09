// Pure helper: collapse repeat logs of the same meal into one summed card.
// Kept framework-free + CommonJS so it runs under node --test like foodScale.js.
// Grouping key = normalized name + mealType, so Lunch and Dinner stay separate.
// Display-only: the DB keeps every log; callers pass one member id to delete a
// single serving (count drops instead of the whole card vanishing).

function round1(n) {
  return Math.round((Number(n) || 0) * 10) / 10;
}

function groupMealsForDay(dayMeals) {
  const groups = new Map();
  const order = [];
  for (const m of dayMeals || []) {
    const nameKey = String(m?.name ?? '').trim().toLowerCase();
    if (!nameKey) continue;
    const typeKey = String(m?.mealType ?? '');
    const key = `${typeKey}|${nameKey}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        key,
        name: String(m?.name ?? '').trim(),
        mealType: m?.mealType ?? 'Snack',
        kcal: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        count: 0,
        ids: [],
        latestId: null,
        imageUrl: null,
        emoji: null,
        loggedAt: null,
      };
      groups.set(key, g);
      order.push(key);
    }
    g.count += 1;
    const id = m?.id ?? m?._id;
    if (id != null) g.ids.push(String(id));
    g.kcal += Number(m?.kcal) || 0;
    g.protein += Number(m?.protein) || 0;
    g.carbs += Number(m?.carbs) || 0;
    g.fat += Number(m?.fat) || 0;
    // Latest entry wins for display name/time/image/id, independent of input order.
    const t = m?.loggedAt ? new Date(m.loggedAt).getTime() : NaN;
    const cur = g.loggedAt ? new Date(g.loggedAt).getTime() : NaN;
    if (!g.loggedAt || (!Number.isNaN(t) && t >= cur)) {
      if (m?.loggedAt) g.loggedAt = m.loggedAt;
      if (id != null) g.latestId = String(id);
      const trimmed = String(m?.name ?? '').trim();
      if (trimmed) g.name = trimmed;
      if (m?.imageUrl) g.imageUrl = m.imageUrl;
      if (m?.emoji) g.emoji = m.emoji;
    } else {
      if (!g.imageUrl && m?.imageUrl) g.imageUrl = m.imageUrl;
      if (!g.emoji && m?.emoji) g.emoji = m.emoji;
    }
  }
  return order.map((key) => {
    const g = groups.get(key);
    // id = most recently logged member, so trash removes ONE serving.
    const { latestId, ...rest } = g;
    return {
      ...rest,
      id: latestId ?? null,
      kcal: Math.round(g.kcal),
      protein: round1(g.protein),
      carbs: round1(g.carbs),
      fat: round1(g.fat),
    };
  });
}

module.exports = { groupMealsForDay };
