// components/nsg.js
// -----------------------------------------------------------------------------
// Rendu détaillé pour un Network Security Group Azure (NSG).
// Retourne un bloc HTML (string) structuré et stylé, prêt à être injecté dans
// le modal "detail-modal".
// -----------------------------------------------------------------------------

export function renderNsg(raw) {
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
