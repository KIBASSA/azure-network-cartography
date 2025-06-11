// components/vnet.js
// -----------------------------------------------------------------------------
// Rendu détaillé pour un Virtual Network Azure (VNet).
// Retourne un bloc HTML à afficher dans le modal.
// -----------------------------------------------------------------------------

export function renderVnet(raw) {
  const {
    name,
    location,
    addressSpace = {},
    subnets = [],
    dnsServers = [],
    ddosProtectionPlan,
    virtualNetworkPeerings = [],
    tags: rawTags,
  } = raw;
  const tags = rawTags || {};

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const addressPrefixes = addressSpace.addressPrefixes || [];
  const shortName = (id) => (id ? id.split('/').pop() : '—');
  const toKeyValList = (obj) =>
    Object.entries(obj)
      .map(([k, v]) => `<li><strong>${k}:</strong> ${v}</li>`)
      .join('');

  // ---------------------------------------------------------------------------
  // Stats bar
  // ---------------------------------------------------------------------------
  const statsBar = `
    <div class="stats-bar">
      <div class="stat-item"><span class="stat-number">${addressPrefixes.length}</span><span>Préfixes</span></div>
      <div class="stat-item"><span class="stat-number">${subnets.length}</span><span>Subnets</span></div>
      <div class="stat-item"><span class="stat-number">${virtualNetworkPeerings.length}</span><span>Peering</span></div>
      <div class="stat-item"><span class="stat-number">${dnsServers.length}</span><span>DNS custom</span></div>
      <div class="stat-item"><span class="stat-number">${location}</span><span>Région</span></div>
    </div>`;

  // ---------------------------------------------------------------------------
  // Lists
  // ---------------------------------------------------------------------------
  const prefixList = addressPrefixes
    .map((p) => `<li class="bg-slate-800/50 rounded px-3 py-1">${p}</li>`) 
    .join('');

  const subnetList = subnets.length
    ? subnets
        .map((s) => `<li class="bg-slate-800/50 rounded px-3 py-1 cursor-pointer" onclick="window.showSubnetDetail('${encodeURIComponent(
            JSON.stringify(s)
          )}')">${shortName(s.id)}</li>`)
        .join('')
    : '<li class="text-slate-400">Aucun</li>';

  const peeringList = virtualNetworkPeerings.length
    ? virtualNetworkPeerings
        .map((p) => `<li class="bg-slate-800/50 rounded px-3 py-1">${p.name}</li>`) 
        .join('')
    : '<li class="text-slate-400">Aucun</li>';

  const dnsList = dnsServers.length
    ? dnsServers.map((dns) => `<li class="bg-slate-800/50 rounded px-3 py-1">${dns}</li>`).join('')
    : '<li class="text-slate-400">Par défaut (Azure)</li>';

  // Tags
  const tagsHtml = Object.keys(tags).length
    ? `<ul class="list-disc list-inside text-sm">${toKeyValList(tags)}</ul>`
    : '<p class="text-slate-400">Aucun</p>';

  // DDOS plan
  const ddosHtml = ddosProtectionPlan
    ? `<p class="bg-slate-800/50 rounded px-3 py-2 inline-block">${shortName(
        ddosProtectionPlan.id
      )}</p>`
    : '<p class="text-slate-400">Aucun</p>';

  // ---------------------------------------------------------------------------
  // Assemble HTML final
  // ---------------------------------------------------------------------------
  return `
    <div class="vnet-component">
      <h2 class="component-title">Virtual Network – ${name}</h2>
      ${statsBar}

      <h3 class="section-title mt-6 mb-2">Espace d'adressage</h3>
      <ul class="flex flex-wrap gap-2">${prefixList}</ul>

      <h3 class="section-title mt-6 mb-2">Subnets</h3>
      <ul class="flex flex-wrap gap-2">${subnetList}</ul>

      <h3 class="section-title mt-6 mb-2">Peering</h3>
      <ul class="flex flex-wrap gap-2">${peeringList}</ul>

      <h3 class="section-title mt-6 mb-2">DNS Servers</h3>
      <ul class="flex flex-wrap gap-2">${dnsList}</ul>

      <h3 class="section-title mt-6 mb-2">DDoS Protection</h3>
      ${ddosHtml}

      <h3 class="section-title mt-6 mb-2">Tags</h3>
      ${tagsHtml}
    </div>`;
}

// Helper global pour cliquer sur subnet
window.showSubnetDetail = function (encoded) {
  const subnet = JSON.parse(decodeURIComponent(encoded));
  alert(`Subnet ${subnet.name || subnet.id}\n\n${JSON.stringify(subnet, null, 2)}`);
};
