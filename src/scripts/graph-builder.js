// scripts/graph-builder.js
// -----------------------------------------------------------------------------
// Parse le JSON Azure d'un fichier et construit le graphe Cytoscape.
// Conserve tout l'algorithme de ton prototype initial, mais déplacé dans ce
// module ES, pour garder la page index.html épurée.
// -----------------------------------------------------------------------------

import { showDetail } from './detail-renderer.js';

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
export function buildGraph(d) {
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
