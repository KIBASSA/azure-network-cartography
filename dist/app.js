(function(){

// --- nic.js ---
// components/nic.js
// -----------------------------------------------------------------------------
// Rendu détaillé pour une Network Interface (NIC) Azure. Chaque NIC peut
// contenir plusieurs configurations IP, être associée à un NSG, et posséder
// un éventuel PIP. Cette fonction retourne un bloc HTML prêt à être injecté
// dans le modal "detail-modal".
// -----------------------------------------------------------------------------

function renderNic(raw) {
  const {
    name,
    networkSecurityGroup,
    ipConfigurations = [],
    macAddress,
    enableAcceleratedNetworking,
    dnsSettings,
  } = raw;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  // Renvoie juste le dernier segment d'un id ARM (…/subnets/mySubnet → mySubnet)
  const shortName = (id) => (id ? id.split('/').pop() : '—');

  // ---------------------------------------------------------------------------
  // IP Configuration rows
  // ---------------------------------------------------------------------------
  const ipRows = ipConfigurations
    .map((cfg) => {
      const subnet = shortName(cfg.subnet?.id);
      const privateIp = cfg.privateIPAddress || '—';
      const alloc = cfg.privateIPAllocationMethod || '—';
      const pipName = shortName(cfg.publicIPAddress?.id);
      const pipHtml = pipName !== '—'
        ? `<span class="inline-block bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded text-xs ml-1">${pipName}</span>`
        : '—';

      return `
        <tr>
          <td class="border-b border-slate-700 py-1">${cfg.name}</td>
          <td class="border-b border-slate-700 py-1">${privateIp}</td>
          <td class="border-b border-slate-700 py-1">${alloc}</td>
          <td class="border-b border-slate-700 py-1">${subnet}</td>
          <td class="border-b border-slate-700 py-1">${pipHtml}</td>
        </tr>`;
    })
    .join('');

  // ---------------------------------------------------------------------------
  // Stats bar
  // ---------------------------------------------------------------------------
  const nsgName = shortName(networkSecurityGroup?.id);

  const statsBar = `
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-number">${ipConfigurations.length}</span>
        <span>IP Configs</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">${macAddress || '—'}</span>
        <span>MAC</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">${enableAcceleratedNetworking ? 'Oui' : 'Non'}</span>
        <span>Accel. Net</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">${nsgName}</span>
        <span>NSG Lié</span>
      </div>
    </div>`;

  // ---------------------------------------------------------------------------
  // DNS settings (facultatif)
  // ---------------------------------------------------------------------------
  const dnsBlock = dnsSettings
    ? `
        <h3 class="section-title mt-6 mb-2">DNS Settings</h3>
        <pre class="bg-slate-800/50 rounded-lg p-3 overflow-x-auto text-xs">${JSON.stringify(
          dnsSettings,
          null,
          2
        )}</pre>`
    : '';

  // ---------------------------------------------------------------------------
  // Assemble le HTML final
  // ---------------------------------------------------------------------------
  return `
    <div class="nic-component">
      <h2 class="component-title">Network Interface – ${name}</h2>
      ${statsBar}

      <h3 class="section-title mt-6 mb-2">Configurations IP</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-sm table-fixed">
          <thead>
            <tr class="text-slate-300 border-b border-slate-700">
              <th class="py-1">Nom</th>
              <th class="py-1">IP Privée</th>
              <th class="py-1">Méthode</th>
              <th class="py-1">Subnet</th>
              <th class="py-1">PIP</th>
            </tr>
          </thead>
          <tbody>
            ${ipRows || '<tr><td colspan="5" class="py-3 text-center">Aucune configuration IP</td></tr>'}
          </tbody>
        </table>
      </div>

      ${dnsBlock}
    </div>`;
}

// --- nsg.js ---
// components/nsg.js
// -----------------------------------------------------------------------------
// Rendu détaillé pour un Network Security Group Azure (NSG).
// Retourne un bloc HTML (string) structuré et stylé, prêt à être injecté dans
// le modal "detail-modal".
// -----------------------------------------------------------------------------

function renderNsg(raw) {
  const {
    name,
    location,
    securityRules = [],
    defaultSecurityRules = [],
    subnets = [],
    networkInterfaces = [],
  } = raw;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const shortName = (id) => (id ? id.split('/').pop() : '—');
  const humanizePort = (p) => (p === '*' || p === undefined ? 'Tous' : p);
  const humanizeProto = (proto) =>
    proto === '*' || proto === undefined ? 'Tous' : proto.toUpperCase();

  // Filtrer allow / deny (les règles Azure stockent access = "Allow" | "Deny")
  const allows = securityRules.filter((r) => r.access?.toLowerCase() === 'allow');
  const denys = securityRules.filter((r) => r.access?.toLowerCase() === 'deny');

  // ---------------------------------------------------------------------------
  // Stats bar
  // ---------------------------------------------------------------------------
  const statsBar = `
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-number">${securityRules.length}</span>
        <span>Règles Custom</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">${defaultSecurityRules.length}</span>
        <span>Règles Défaut</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">${subnets.length}</span>
        <span>Subnets liés</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">${networkInterfaces.length}</span>
        <span>NICs liées</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">${location}</span>
        <span>Région</span>
      </div>
    </div>`;

  // ---------------------------------------------------------------------------
  // Générateur d'une carte règle
  // ---------------------------------------------------------------------------
  const ruleCard = (rule, isAllow) => {
    const key = `rule-${rule.name}`;
    const colorClass = isAllow ? 'allow' : 'deny';
    const prot = humanizeProto(rule.protocol);
    const port = humanizePort(rule.destinationPortRange ?? rule.destinationPortRanges?.join(', '));
    const dir = rule.direction || 'Inbound';
    return `
      <div class="rule-item ${colorClass}" data-info="${key}" onclick="window.showRuleDetail('${encodeURIComponent(
      JSON.stringify(rule)
    )}')">
        <strong>${rule.name}</strong><br>
        ${prot} | Port : ${port} | Prio : ${rule.priority} | Dir : ${dir}
      </div>`;
  };

  // ---------------------------------------------------------------------------
  // Règles Allow / Deny
  // ---------------------------------------------------------------------------
  const rulesHtml = (list, isAllow) =>
    list
      .sort((a, b) => a.priority - b.priority)
      .map((r) => ruleCard(r, isAllow))
      .join('') ||
    '<p class="text-center text-slate-400 py-2">Aucune</p>';

  // ---------------------------------------------------------------------------
  // Subnet & NIC blocks
  // ---------------------------------------------------------------------------
  const subnetBlock = subnets.length
    ? `
      <div class="subnet-connection mt-6">
        <h3 class="section-title mb-2">Subnets associés</h3>
        <div class="grid gap-2 md:grid-cols-2">
          ${subnets
            .map(
              (s) => `
            <div class="subnet-item" onclick="window.showSubnetDetail('${encodeURIComponent(
              JSON.stringify(s)
            )}')">
              <strong>${shortName(s.id)}</strong><br>${s.addressPrefix || ''}
            </div>`
            )
            .join('')}
        </div>
      </div>`
    : '';

  const nicBlock = networkInterfaces.length
    ? `
      <div class="subnet-connection mt-6">
        <h3 class="section-title mb-2">NICs associées</h3>
        <div class="grid gap-2 md:grid-cols-2">
          ${networkInterfaces
            .map(
              (n) => `
            <div class="subnet-item" onclick="window.showNicDetail('${encodeURIComponent(
              JSON.stringify(n)
            )}')">
              <strong>${shortName(n.id)}</strong>
            </div>`
            )
            .join('')}
        </div>
      </div>`
    : '';

  // ---------------------------------------------------------------------------
  // Assemble HTML final
  // ---------------------------------------------------------------------------
  return `
    <div class="nsg-component">
      <h2 class="component-title">Network Security Group – ${name}</h2>
      ${statsBar}

      <div class="rules-container mt-6">
        <div class="rule-section">
          <h3>🔓 Règles d'Autorisation</h3>
          ${rulesHtml(allows, true)}
        </div>
        <div class="rule-section">
          <h3>🔒 Règles de Refus</h3>
          ${rulesHtml(denys, false)}
        </div>
      </div>

      ${subnetBlock}
      ${nicBlock}
    </div>`;
}

// -----------------------------------------------------------------------------
// Expose global helpers pour debug rapide (optionnel)
// -----------------------------------------------------------------------------
window.showRuleDetail = function (encoded) {
  const rule = JSON.parse(decodeURIComponent(encoded));
  alert(`Règle ${rule.name}\n\n${JSON.stringify(rule, null, 2)}`);
};
window.showSubnetDetail = function (encoded) {
  const subnet = JSON.parse(decodeURIComponent(encoded));
  alert(`Subnet ${subnet.name || subnet.id}\n\n${JSON.stringify(subnet, null, 2)}`);
};
window.showNicDetail = function (encoded) {
  const nic = JSON.parse(decodeURIComponent(encoded));
  alert(`NIC ${nic.name || nic.id}\n\n${JSON.stringify(nic, null, 2)}`);
};

// --- pip.js ---
// components/pip.js
// -----------------------------------------------------------------------------
// Rendu détaillé pour une Public IP Azure (PIP).
// Retourne une chaîne HTML structurée à injecter dans le modal.
// -----------------------------------------------------------------------------

function renderPip(raw) {
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

// --- renderGeneric.js ---
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
function renderGeneric(raw, resourceType = 'Ressource inconnue') {
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

// --- subnet.js ---
// components/subnet.js
// -----------------------------------------------------------------------------
// Rendu détaillé pour un Subnet Azure.
// Affiche les préfixes d'adresses, NSG associé, délégations, points de service,
// et les Private Endpoints éventuels. Renvoyé sous forme de HTML string.
// -----------------------------------------------------------------------------

function renderSubnet(raw) {
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

// --- vm.js ---
// components/vm.js
// -----------------------------------------------------------------------------
// Rendu détaillé pour une Virtual Machine Azure (VM).
// Produit une chaîne HTML à injecter dans le modal de détails.
// -----------------------------------------------------------------------------

function renderVm(raw) {
  const {
    name,
    location,
    hardwareProfile = {},
    storageProfile = {},
    osProfile = {},
    networkProfile = {},
    tags = {},
    provisioningState,
  } = raw;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const shortName = (id) => (id ? id.split('/').pop() : '—');
  const toKeyValList = (obj) =>
    Object.entries(obj)
      .map(([k, v]) => `<li><strong>${k}:</strong> ${v}</li>`)
      .join('');

  // Hardware & OS
  const vmSize = hardwareProfile.vmSize || '—';
  const osDisk = storageProfile.osDisk || {};
  const osType = osDisk.osType || osProfile?.osType || '—';

  // Network
  const nics = networkProfile.networkInterfaces || [];
  const nicListHtml = nics.length
    ? nics
        .map((nic) => `<li class="bg-slate-800/50 rounded px-3 py-1 cursor-pointer" onclick="window.showNicDetail('${encodeURIComponent(
            JSON.stringify(nic)
          )}')">${shortName(nic.id)}</li>`)
        .join('')
    : '<li class="text-slate-400">Aucune</li>';

  // Disques
  const dataDisks = storageProfile.dataDisks || [];
  const diskCount = 1 + dataDisks.length; // OS disk + data disks
  const diskListHtml = [
    `<li class="bg-slate-800/50 rounded px-3 py-1">OS – ${osDisk.name || '—'} (${osDisk.osType || '—'})</li>`,
    ...dataDisks.map(
      (d) => `<li class="bg-slate-800/50 rounded px-3 py-1">${d.name} (${d.diskSizeGB} GB)</li>`
    ),
  ].join('');

  // Tags
  const tagsHtml = Object.keys(tags).length
    ? `<ul class="list-disc list-inside text-sm">${toKeyValList(tags)}</ul>`
    : '<p class="text-slate-400">Aucun</p>';

  // ---------------------------------------------------------------------------
  // Stats bar
  // ---------------------------------------------------------------------------
  const statsBar = `
    <div class="stats-bar">
      <div class="stat-item"><span class="stat-number">${vmSize}</span><span>Taille</span></div>
      <div class="stat-item"><span class="stat-number">${osType}</span><span>OS</span></div>
      <div class="stat-item"><span class="stat-number">${nics.length}</span><span>NICs</span></div>
      <div class="stat-item"><span class="stat-number">${diskCount}</span><span>Disques</span></div>
      <div class="stat-item"><span class="stat-number">${location}</span><span>Région</span></div>
    </div>`;

  // ---------------------------------------------------------------------------
  // Assemble HTML final
  // ---------------------------------------------------------------------------
  return `
    <div class="vm-component">
      <h2 class="component-title">Virtual Machine – ${name}</h2>
      <p class="text-sm text-slate-400 mb-2">État : ${provisioningState || '—'}</p>
      ${statsBar}

      <h3 class="section-title mt-6 mb-2">Interfaces réseau</h3>
      <ul class="flex flex-wrap gap-2">${nicListHtml}</ul>

      <h3 class="section-title mt-6 mb-2">Disques</h3>
      <ul class="flex flex-wrap gap-2">${diskListHtml}</ul>

      <h3 class="section-title mt-6 mb-2">Tags</h3>
      ${tagsHtml}
    </div>`;
}

// Helper global rapide pour cliquer sur NIC dans la VM
window.showNicDetail = function (encoded) {
  const nic = JSON.parse(decodeURIComponent(encoded));
  alert(`NIC ${nic.name || nic.id}\n\n${JSON.stringify(nic, null, 2)}`);
};

// --- vnet.js ---
// components/vnet.js
// -----------------------------------------------------------------------------
// Rendu détaillé pour un Virtual Network Azure (VNet).
// Retourne un bloc HTML à afficher dans le modal.
// -----------------------------------------------------------------------------

function renderVnet(raw) {
  const {
    name,
    location,
    addressSpace = {},
    subnets = [],
    dnsServers = [],
    ddosProtectionPlan,
    virtualNetworkPeerings = [],
    tags = {},
  } = raw;

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

// --- detail-renderer.js ---
// scripts/detail-renderer.js
// -----------------------------------------------------------------------------
// Rôle : relier les nœuds Cytoscape (data.type + data.raw) aux fonctions de
// rendu HTML définies dans /components/*.js. Injecte ensuite le fragment dans
// le modal "detail-modal" et affiche ce dernier via MicroModal.
// -----------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Table de correspondance « type → renderer »
// ---------------------------------------------------------------------------
const RENDER_MAP = {
  nsg   : renderNsg,
  subnet: renderSubnet,
  vnet  : renderVnet,
  nic   : renderNic,
  vm    : renderVm,
  pip   : renderPip,
};

/**
 * Affiche le détail de la ressource cliquée.
 * @param {object} nodeData - data() d'un nœud Cytoscape {type, raw, name, …}
 */
function showDetail(nodeData) {
  if (!nodeData) return;

  const { type, raw } = nodeData;
  const renderer = RENDER_MAP[type] || ((r) => renderGeneric(r, type));

  let html;
  try {
    html = renderer(raw || {});
  } catch (err) {
    console.error('Renderer error', err);
    html = `<pre class="text-red-400">Erreur de rendu : ${err.message}</pre>`;
  }

  const box = document.getElementById('modal-content');
  if (box) box.innerHTML = html;
  MicroModal.show('detail-modal');
}

// Expose global pour que graph-builder (et potentiellement d'autres scripts)
// puissent l'appeler sans import explicite.
window.showDetail = showDetail;

// --- graph-builder.js ---
// scripts/graph-builder.js
// -----------------------------------------------------------------------------
// Parse le JSON Azure d'un fichier et construit le graphe Cytoscape.
// Conserve tout l'algorithme de ton prototype initial, mais déplacé dans ce
// module ES, pour garder la page index.html épurée.
// -----------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Constantes & variables globales (limitées au module)
// ---------------------------------------------------------------------------

/**
 * STYLE_MAP : couleur + forme pour chaque type de nœud.
 */
const STYLE_MAP = {
  vnet:   { color: '#6366f1', shape: 'roundrectangle' },
  subnet: { color: '#22d3ee', shape: 'ellipse' },
  nsg:    { color: '#ef4444', shape: 'diamond' },
  nic:    { color: '#a855f7', shape: 'hexagon' },
  vm:     { color: '#4ade80', shape: 'rectangle' },
  pip:    { color: '#facc15', shape: 'triangle' },
  other:  { color: '#6b7280', shape: 'ellipse' },
};

let cy; // instance Cytoscape courante

// ---------------------------------------------------------------------------
// Helpers DOM
// ---------------------------------------------------------------------------
const cyEl = () => document.getElementById('cy');

/**
 * Style Cytoscape commun (labels centrés + wrap)
 */
function cyStyle() {
  return [
    {
      selector: 'node',
      style: {
        label: 'data(labelDisplay)',
        'text-valign': 'center',
        'text-halign': 'center',
        color: '#fff',
        'font-size': '10px',
        'text-wrap': 'wrap',
        'text-max-width': 100,
        'white-space': 'pre', // conserve les \n
      },
    },
    {
      selector: 'edge',
      style: {
        width: 2,
        'line-color': '#64748b',
        'target-arrow-color': '#64748b',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
      },
    },
    {
      selector: '.hl',
      style: { 'border-color': '#f59e0b', 'border-width': 4 },
    },
  ];
}

// ---------------------------------------------------------------------------
// Build Graph
// ---------------------------------------------------------------------------

/**
 * Construit le graphe Cytoscape à partir des données JSON Azure.
 * @param {object} d Données Azure (vnets, subnets, nsg, ...)
 */
function buildGraph(d) {
  const nodes = [];
  const edges = [];
  const seen = new Set();

  // Helper pour ajouter un nœud unique
  const addNode = (id, name, type, raw) => {
    if (seen.has(id)) return;
    const sty = STYLE_MAP[type] || STYLE_MAP.other;
    nodes.push({
      data: {
        id,
        name,
        type,
        raw,
        labelDisplay: `${type.toUpperCase()}\n${name}`,
      },
      style: { 'background-color': sty.color, shape: sty.shape },
    });
    seen.add(id);
  };

  // ---------------------------------------------------------------------
  // 1. VNets + subnets
  // ---------------------------------------------------------------------
  (d.vnets || []).forEach((v) => {
    addNode(v.id, v.name, 'vnet', v);
    (v.subnets || []).forEach((s) => {
      addNode(s.id, s.name, 'subnet', s);
      edges.push({ data: { id: `${v.id}->${s.id}`, source: v.id, target: s.id } });
    });
  });

  // 2. Stand-alone subnets
  (d.subnets || []).forEach((s) => addNode(s.id, s.name, 'subnet', s));

  // 3. NSGs
  (d.network_security_groups || []).forEach((nsg) => {
    addNode(nsg.id, nsg.name, 'nsg', nsg);
    nsg.subnets?.forEach((r) =>
      edges.push({ data: { id: `${nsg.id}->${r.id}`, source: nsg.id, target: r.id } })
    );
    nsg.networkInterfaces?.forEach((r) =>
      edges.push({ data: { id: `${nsg.id}->${r.id}`, source: nsg.id, target: r.id } })
    );
  });

  // 4. NICs & PIPs
  (d.nics || []).forEach((nic) => {
    addNode(nic.id, nic.name, 'nic', nic);
    nic.ipConfigurations?.forEach((cfg) => {
      if (cfg.subnet) {
        edges.push({ data: { id: `${nic.id}->${cfg.subnet.id}`, source: nic.id, target: cfg.subnet.id } });
      }
      if (cfg.publicIPAddress) {
        const pipId = cfg.publicIPAddress.id;
        addNode(pipId, pipId.split('/').pop(), 'pip', cfg.publicIPAddress);
        edges.push({ data: { id: `${nic.id}->${pipId}`, source: nic.id, target: pipId } });
      }
    });
  });

  // 5. VMs
  (d.virtual_machines || []).forEach((vm) => {
    addNode(vm.id, vm.name, 'vm', vm);
    vm.networkProfile?.networkInterfaces?.forEach((r) =>
      edges.push({ data: { id: `${vm.id}->${r.id}`, source: vm.id, target: r.id } })
    );
  });

  // 6. Stand‑alone PIPs
  (d.public_ips || []).forEach((pip) => addNode(pip.id, pip.name, 'pip', pip));

  // ---------------------------------------------------------------------
  // Instanciation Cytoscape
  // ---------------------------------------------------------------------
  if (cy) cy.destroy();

  const layoutCfg = { name: 'fcose', animate: true, randomize: true };
  try {
    cy = cytoscape({
      container: cyEl(),
      elements: { nodes, edges },
      layout: layoutCfg,
      style: cyStyle(),
    });
  } catch {
    cy = cytoscape({
      container: cyEl(),
      elements: { nodes, edges },
      layout: { name: 'breadthfirst', animate: true },
      style: cyStyle(),
    });
  }

  // Interaction : clic sur nœud -> détail
  cy.on('tap', 'node', (evt) => showDetail(evt.target.data()));

  // Hover highlight
  cy.on('mouseover', 'node', (e) => e.target.addClass('hl'));
  cy.on('mouseout', 'node', (e) => e.target.removeClass('hl'));
}

// ---------------------------------------------------------------------------
// Événements UI (legend & file input)
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  // Bouton légende
  const legendBtn = document.getElementById('legendBtn');
  if (legendBtn) {
    legendBtn.addEventListener('click', () => MicroModal.show('legend-modal'));
  }

  // Input de fichier JSON
  const fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const json = JSON.parse(ev.target.result);
          buildGraph(json);
        } catch (err) {
          alert('❌ JSON invalide : ' + err.message);
        }
      };
      reader.readAsText(file);
    });
  }
});
})();
