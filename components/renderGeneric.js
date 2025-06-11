// components/renderGeneric.js
// -----------------------------------------------------------------------------
// Rendu générique de secours pour tout type de ressource non encore doté d'un
// composant dédié. Affiche le nom, le type (si disponible) et un JSON formaté.
// -----------------------------------------------------------------------------

/**
 * @param {object} raw - Objet Azure tel que présent dans le JSON d'origine.
 * @param {string} [resourceType] - Type (slug) de la ressource, si connu.
 * @returns {string} HTML string à injecter dans le modal.
 */
export function renderGeneric(raw, resourceType = 'Ressource inconnue') {
  const { name = '—', id = '—' } = raw;
  const keysCount = Object.keys(raw).length;

  return `
    <div class="generic-component">
      <h2 class="component-title">${resourceType} – ${name}</h2>

      <div class="stats-bar">
        <div class="stat-item">
          <span class="stat-number">${keysCount}</span>
          <span>Champs</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">${id.split('/').pop()}</span>
          <span>ID court</span>
        </div>
      </div>

      <h3 class="section-title mt-6 mb-2">Détails bruts</h3>
      <pre class="bg-slate-800/50 rounded-lg p-3 overflow-x-auto text-xs">${JSON.stringify(
        raw,
        null,
        2
      )}</pre>
    </div>`;
}
