// scripts/detail-renderer.js
// -----------------------------------------------------------------------------
// Rôle : relier les nœuds Cytoscape (data.type + data.raw) aux fonctions de
// rendu HTML définies dans /components/*.js. Injecte ensuite le fragment dans
// le modal "detail-modal" et affiche ce dernier via MicroModal.
// -----------------------------------------------------------------------------

import { renderNsg }    from '../components/nsg.js';
import { renderSubnet } from '../components/subnet.js';
import { renderVnet }   from '../components/vnet.js';
import { renderNic }    from '../components/nic.js';
import { renderVm }     from '../components/vm.js';
import { renderPip }    from '../components/pip.js';
import { renderGeneric } from '../components/renderGeneric.js';

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
export function showDetail(nodeData) {
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
