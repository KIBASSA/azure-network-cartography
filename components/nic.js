// components/nic.js
// -----------------------------------------------------------------------------
// Rendu détaillé pour une Network Interface (NIC) Azure. Chaque NIC peut
// contenir plusieurs configurations IP, être associée à un NSG, et posséder
// un éventuel PIP. Cette fonction retourne un bloc HTML prêt à être injecté
// dans le modal "detail-modal".
// -----------------------------------------------------------------------------

export function renderNic(raw) {
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
