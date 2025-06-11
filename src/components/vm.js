// components/vm.js
// -----------------------------------------------------------------------------
// Rendu détaillé pour une Virtual Machine Azure (VM).
// Produit une chaîne HTML à injecter dans le modal de détails.
// -----------------------------------------------------------------------------

export function renderVm(raw) {
  const {
    name,
    location,
    hardwareProfile = {},
    storageProfile = {},
    osProfile = {},
    networkProfile = {},
    tags: rawTags,
    provisioningState,
  } = raw;
  const tags = rawTags || {};

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
