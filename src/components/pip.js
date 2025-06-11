// components/pip.js
// -----------------------------------------------------------------------------
// Rendu détaillé pour une Public IP Azure (PIP).
// Retourne une chaîne HTML structurée à injecter dans le modal.
// -----------------------------------------------------------------------------

export function renderPip(raw) {
  const {
    name,
    publicIPAddressVersion: version = 'IPv4',
    publicIPAllocationMethod: allocation = 'Dynamic',
    ipAddress,
    sku = {},
    idleTimeoutInMinutes,
    dnsSettings,
    location,
    ipTags = [],
  } = raw;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const skuName = sku.name || '—';
  const skuTier = sku.tier || '—';
  const ipTagList = ipTags.map((t) => `${t.tag} =${ t.ipTag}`).join(', ');

  // Cherche rapidement à quoi la PIP est liée (NIC, LB, etc.)
  // Souvent dans raw.ipConfiguration.id ou raw.loadBalancerFrontendIpConfiguration.id
  let attachedTo = '—';
  if (raw.ipConfiguration?.id) attachedTo = raw.ipConfiguration.id.split('/').pop();
  if (raw.loadBalancerFrontendIpConfiguration?.id)
    attachedTo = raw.loadBalancerFrontendIpConfiguration.id.split('/').pop();

  // ---------------------------------------------------------------------------
  // Stats bar
  // ---------------------------------------------------------------------------
  const statsBar = `
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-number">${ipAddress || '—'}</span>
        <span>Adresse IP</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">${version}</span>
        <span>Version</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">${allocation}</span>
        <span>Méthode</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">${skuName}</span>
        <span>SKU</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">${location}</span>
        <span>Région</span>
      </div>
    </div>`;

  // ---------------------------------------------------------------------------
  // Détails supplémentaires
  // ---------------------------------------------------------------------------
  const extraDetails = `
    <div class="grid md:grid-cols-2 gap-4 mt-6 text-sm">
      <div>
        <h3 class="section-title mb-1">Association</h3>
        <p class="bg-slate-800/50 rounded p-2">${attachedTo}</p>
      </div>
      <div>
        <h3 class="section-title mb-1">Idle Timeout</h3>
        <p class="bg-slate-800/50 rounded p-2">${idleTimeoutInMinutes || '—'} min</p>
      </div>
      <div>
        <h3 class="section-title mb-1">SKU Tier</h3>
        <p class="bg-slate-800/50 rounded p-2">${skuTier}</p>
      </div>
      <div>
        <h3 class="section-title mb-1">Tags IP</h3>
        <p class="bg-slate-800/50 rounded p-2">${ipTagList || '—'}</p>
      </div>
    </div>`;

  // DNS settings block facultatif
  const dnsBlock = dnsSettings
    ? `
        <h3 class="section-title mt-6 mb-1">DNS Settings</h3>
        <pre class="bg-slate-800/50 rounded-lg p-3 overflow-x-auto text-xs">${JSON.stringify(
          dnsSettings,
          null,
          2
        )}</pre>`
    : '';

  // ---------------------------------------------------------------------------
  // Assemble HTML final
  // ---------------------------------------------------------------------------
  return `
    <div class="pip-component">
      <h2 class="component-title">Public IP – ${name}</h2>
      ${statsBar}
      ${extraDetails}
      ${dnsBlock}
    </div>`;
}
