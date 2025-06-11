// components/subnet.js
// -----------------------------------------------------------------------------
// Rendu détaillé pour un Subnet Azure.
// Affiche les préfixes d'adresses, NSG associé, délégations, points de service,
// et les Private Endpoints éventuels. Renvoyé sous forme de HTML string.
// -----------------------------------------------------------------------------

export function renderSubnet(raw) {
  const {
    name,
    addressPrefix,
    addressPrefixes = [],
    networkSecurityGroup,
    delegations = [],
    serviceEndpoints = [],
    privateEndpoints = [],
    ipConfigurations = [], // présent quand on récupère via NICs
  } = raw;

  // Fusionne addressPrefix (singulier) et array pour unifier l'affichage
  const prefixes = addressPrefixes.length ? addressPrefixes : addressPrefix ? [addressPrefix] : [];

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const shortName = (id) => (id ? id.split('/').pop() : '—');

  // ---------------------------------------------------------------------------
  // Stats bar
  // ---------------------------------------------------------------------------
  const statsBar = `
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-number">${prefixes.length}</span>
        <span>Préfixes IP</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">${networkSecurityGroup ? 'Oui' : 'Non'}</span>
        <span>NSG lié</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">${delegations.length}</span>
        <span>Délégations</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">${serviceEndpoints.length}</span>
        <span>Service EP</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">${privateEndpoints.length || ipConfigurations.length}</span>
        <span>Endpoints</span>
      </div>
    </div>`;

  // ---------------------------------------------------------------------------
  // Prefix list
  // ---------------------------------------------------------------------------
  const prefixList = prefixes
    .map((p) => `<li class="bg-slate-800/50 rounded px-3 py-1">${p}</li>`) 
    .join('');

  // ---------------------------------------------------------------------------
  // Delegations + service endpoints lists
  // ---------------------------------------------------------------------------
  const delegationList = delegations.length
    ? delegations
        .map((d) => `<li class="bg-slate-800/50 rounded px-3 py-1">${d.serviceName}</li>`) 
        .join('')
    : '<li class="text-slate-400">Aucune</li>';

  const serviceEpList = serviceEndpoints.length
    ? serviceEndpoints
        .map((s) => `<li class="bg-slate-800/50 rounded px-3 py-1">${s.service}</li>`) 
        .join('')
    : '<li class="text-slate-400">Aucun</li>';

  // Private endpoints / ipConfigs
  const peList = (privateEndpoints.length ? privateEndpoints : ipConfigurations)
    .map((pe) => `<li class="bg-slate-800/50 rounded px-3 py-1">${shortName(pe.id)}</li>`)
    .join('') || '<li class="text-slate-400">Aucun</li>';

  // NSG block
  const nsgBlock = networkSecurityGroup
    ? `<h3 class="section-title mt-6 mb-2">NSG associé</h3>
       <p class="bg-slate-800/50 rounded px-3 py-2 inline-block cursor-pointer" onclick="window.showNsgDetail('${encodeURIComponent(
         JSON.stringify(networkSecurityGroup)
       )}')">${shortName(networkSecurityGroup.id)}</p>`
    : '';

  // ---------------------------------------------------------------------------
  // Assemble HTML final
  // ---------------------------------------------------------------------------
  return `
    <div class="subnet-component">
      <h2 class="component-title">Subnet – ${name}</h2>
      ${statsBar}

      <h3 class="section-title mt-6 mb-2">Préfixes IP</h3>
      <ul class="flex flex-wrap gap-2">${prefixList}</ul>

      <h3 class="section-title mt-6 mb-2">Service Endpoints</h3>
      <ul class="flex flex-wrap gap-2">${serviceEpList}</ul>

      <h3 class="section-title mt-6 mb-2">Délégations</h3>
      <ul class="flex flex-wrap gap-2">${delegationList}</ul>

      <h3 class="section-title mt-6 mb-2">Private/Ip Endpoints</h3>
      <ul class="flex flex-wrap gap-2">${peList}</ul>

      ${nsgBlock}
    </div>`;
}

// Expose helper global simple pour debug (optionnel)
window.showNsgDetail = function (encoded) {
  const nsg = JSON.parse(decodeURIComponent(encoded));
  alert(`NSG ${nsg.name || nsg.id}\n\n${JSON.stringify(nsg, null, 2)}`);
};
