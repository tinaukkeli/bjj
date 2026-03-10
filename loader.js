// ─────────────────────────────────────────────
// LOADER — fetches JSON data files and boots the app
// To add a new system, add its JSON file to SOURCES below.
// ─────────────────────────────────────────────

const SOURCES = [
  { key: 'half_guard', file: 'data/half_guard.json' },
  { key: 'standing',   file: 'data/standing.json'   },
];

async function loadSystems() {
  const SYSTEMS = {};
  for (const { key, file } of SOURCES) {
    const res  = await fetch(file);
    const data = await res.json();
    SYSTEMS[key] = data;
  }
  return SYSTEMS;
}

document.addEventListener('DOMContentLoaded', async () => {
  const loading = document.getElementById('loading');
  try {
    const SYSTEMS = await loadSystems();
    if (loading) loading.remove();
    initApp(SYSTEMS);
  } catch (err) {
    console.error('Failed to load data files:', err);
    if (loading) loading.textContent = 'Virhe ladattaessa tietoja. Kokeile uudelleen.';
  }
});
